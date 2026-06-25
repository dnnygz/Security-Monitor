require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// =========================
// DB CONNECTION (NO HARDCODE)
// =========================
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// =========================
// UTIL: RISK ENGINE
// =========================
function evaluarRiesgo(evento) {
    let score = 0;

    if (evento.tipo_evento === "MOVIMIENTO") score += 1;
    if (evento.duracion_segundos > 10) score += 2;
    if (evento.duracion_segundos > 30) score += 3;

    let nivel = "BAJO";
    let activa_camara = false;
    let genera_alerta = false;

    if (score >= 6) {
        nivel = "MEDIO";
        activa_camara = true;
    }

    if (score >= 8) {
        nivel = "ALTO";
        genera_alerta = true;
    }

    return { score, nivel, activa_camara, genera_alerta };
}

// =========================
// AUTH BASIC
// =========================
app.post('/api/usuarios/login', async (req, res) => {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
        return res.status(400).json({ success: false, message: "Faltan datos" });
    }

    try {
        const [rows] = await pool.query(
            "SELECT id, nombre, correo, contrasena, id_rol FROM Usuario WHERE correo = ?",
            [correo]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: "Credenciales inválidas" });
        }

        const user = rows[0];
        const ok = await bcrypt.compare(contrasena, user.contrasena);

        if (!ok) {
            return res.status(401).json({ success: false, message: "Credenciales inválidas" });
        }

	const payload = {
            id_usuario: user.id,
            nombre: user.nombre,
            id_rol: user.id_rol,
            id_tienda: user.id_tienda
        };

	const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '4h' });

        res.json({
            success: true,
	    token: token,
            user: {
                id: user.id,
                nombre: user.nombre,
                id_rol: user.id_rol
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// MIDDLEWARE: VERIFICAR JWT Y ROLES
// ==========================================
const verificarToken = (req, res, next) => {
    // Los tokens se envían comúnmente en la cabecera 'Authorization' como 'Bearer TOKEN_AQUÍ'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extrae solo el string del token

    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        // Verificar el token con la clave secreta
        const datosVerificados = jwt.verify(token, process.env.JWT_SECRET);

        // Inyectamos los datos del usuario dentro del objeto 'req' para que cualquier endpoint los use
        req.usuarioAutenticado = datosVerificados;

        next(); // Continúa hacia el endpoint real
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Token inválido o expirado.' });
    }
};

// =========================
// EVENT CORE (CEREBRO)
// =========================
app.post('/api/eventos-sensor', verificarToken, async (req, res) => {
    const { id_sensor, id_zona, tipo_evento, fecha, duracion_segundos } = req.body;

    if (!id_sensor || !id_zona || !tipo_evento || !fecha) {
        return res.status(400).json({ success: false, message: "Faltan datos" });
    }

    try {
        // 1. guardar evento
        const [ev] = await pool.query(
            `INSERT INTO EventoSensor (id_sensor, id_zona, tipo_evento, fecha, duracion_segundos)
             VALUES (?, ?, ?, ?, ?)`,
            [id_sensor, id_zona, tipo_evento, fecha, duracion_segundos || 0]
        );

        const eventoId = ev.insertId;

        // 2. evaluar riesgo
        const { score, nivel, activa_camara, genera_alerta } =
            evaluarRiesgo({ tipo_evento, duracion_segundos });

        // 3. obtener riesgo default 
        const [riesgoRows] = await pool.query(
            "SELECT id FROM Riesgo ORDER BY id ASC LIMIT 1"
        );

        const id_riesgo = riesgoRows[0]?.id || 1;

        // 4. guardar evaluación
        const [evalRes] = await pool.query(
            `INSERT INTO EvaluacionRiesgo 
            (id_evento, score, id_riesgo, fecha, activa_camara, genera_alerta)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [eventoId, score, id_riesgo, fecha, activa_camara, genera_alerta]
        );

        const evaluacionId = evalRes.insertId;

        res.json({
            success: true,
            eventoId,
            evaluacionId,
            score,
            nivel,
            activa_camara,
            genera_alerta
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/eventos-sensor', verificarToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                ev.id,
                ev.id_sensor,
                ev.id_zona,
                s.modelo AS sensor,
                s.tipo AS tipo_sensor,
                z.nombre AS zona,
                ev.tipo_evento,
                ev.fecha,
                ev.duracion_segundos
            FROM EventoSensor ev
            JOIN Sensor s ON ev.id_sensor = s.id
            JOIN Zona z ON ev.id_zona = z.id
            ORDER BY ev.fecha DESC
        `);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =========================
// GRABACIONES (EVIDENCIA)
// =========================
app.get('/api/grabaciones', verificarToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT g.*, c.modelo AS camara, z.nombre AS zona
            FROM Grabacion g
            JOIN Camara c ON g.id_camara = c.id
            JOIN Zona z ON c.id_zona = z.id
            ORDER BY g.fecha DESC
        `);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.patch('/api/grabaciones/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const { estado_revision } = req.body;
    const estadosPermitidos = ['PENDIENTE', 'REVISADO', 'DESCARTADO'];

    if (!estado_revision || !estadosPermitidos.includes(estado_revision)) {
        return res.status(400).json({
            success: false,
            message: "estado_revision debe ser PENDIENTE, REVISADO o DESCARTADO"
        });
    }

    try {
        const [result] = await pool.query(
            "UPDATE Grabacion SET estado_revision = ? WHERE id = ?",
            [estado_revision, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Grabación no encontrada" });
        }

        res.json({ success: true, id, estado_revision });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =========================
// ANALISIS (IA SIMULADA)
// =========================
app.post('/api/grabaciones-analisis', verificarToken, async (req, res) => {
    const { id_grabacion, descripcion, genero, edad, comportamiento, nivel_confianza } = req.body;

    try {
        const [r] = await pool.query(
            `INSERT INTO GrabacionAnalisis 
            (id_grabacion, descripcion, genero, edad, comportamiento, nivel_confianza)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [id_grabacion, descripcion, genero, edad, comportamiento, nivel_confianza]
        );

        res.json({ success: true, id: r.insertId });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/grabaciones-analisis', verificarToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                ga.*,
                g.fecha AS fecha_grabacion,
                g.estado_revision,
                g.es_sospechoso,
                c.modelo AS camara,
                z.nombre AS zona
            FROM GrabacionAnalisis ga
            JOIN Grabacion g ON ga.id_grabacion = g.id
            JOIN Camara c ON g.id_camara = c.id
            JOIN Zona z ON c.id_zona = z.id
            ORDER BY ga.id DESC
        `);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =========================
// DASHBOARD (BI)
// =========================
app.get('/api/dashboard', verificarToken, async (req, res) => {
    try {
        const [[kpis]] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM EventoSensor) AS eventos,
                (SELECT COUNT(*) FROM EvaluacionRiesgo WHERE genera_alerta = 1) AS alertas,
                (SELECT COUNT(*) FROM Grabacion) AS grabaciones
        `);

        res.json({ success: true, kpis });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/dashboard/metricas', verificarToken, async (req, res) => {
    const { id_tienda } = req.query;

    try {
        const reporteFiltro = id_tienda ? 'WHERE id_tienda = ?' : '';
        const tiendaParams = id_tienda ? [id_tienda] : [];

        const [
            [kpis],
            [tendencia],
            [horarios],
            [zonas],
            [actividad]
        ] = await Promise.all([
            pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM Reporte ${reporteFiltro}) AS total_reportes,
                    (SELECT COUNT(*) FROM EvaluacionRiesgo WHERE genera_alerta = TRUE) AS alertas_criticas,
                    (SELECT COUNT(*) FROM Sensor WHERE id_estado = 1) AS sensores_activos,
                    (SELECT IFNULL(AVG(duracion_segundos), 0) FROM Reporte ${reporteFiltro}) AS tiempo_promedio_resolucion
            `, [...tiendaParams, ...tiendaParams]),
            pool.query(`
                SELECT DATE(fecha) AS dia, COUNT(*) AS total
                FROM Reporte
                ${id_tienda ? 'WHERE id_tienda = ? AND' : 'WHERE'} fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(fecha)
                ORDER BY dia ASC
            `, tiendaParams),
            pool.query(`
                SELECT HOUR(fecha) AS hora, COUNT(*) AS total_incidentes
                FROM Reporte
                ${reporteFiltro}
                GROUP BY HOUR(fecha)
                ORDER BY hora ASC
            `, tiendaParams),
            pool.query(`
                SELECT z.nombre AS zona, COUNT(rep.id) AS total_incidentes
                FROM Reporte rep
                JOIN Zona z ON rep.id_zona = z.id
                ${id_tienda ? 'WHERE rep.id_tienda = ?' : ''}
                GROUP BY rep.id_zona, z.nombre
                ORDER BY total_incidentes DESC
            `, tiendaParams),
            pool.query(`
                SELECT 
                    rep.id,
                    t.nombre AS tienda,
                    z.nombre AS zona,
                    r.nombre AS riesgo,
                    rep.fecha,
                    IFNULL(ga.comportamiento, 'NO DETECTADO') AS comportamiento,
                    IFNULL(ga.nivel_confianza, 'N/A') AS confianza_ia
                FROM Reporte rep
                JOIN Tienda t ON rep.id_tienda = t.id
                JOIN Zona z ON rep.id_zona = z.id
                JOIN Riesgo r ON rep.id_riesgo = r.id
                LEFT JOIN Grabacion g ON g.id_reporte = rep.id
                LEFT JOIN GrabacionAnalisis ga ON ga.id_grabacion = g.id
                ${id_tienda ? 'WHERE rep.id_tienda = ?' : ''}
                ORDER BY rep.fecha DESC
                LIMIT 6
            `, tiendaParams)
        ]);

        res.json({
            success: true,
            filtrado_por_tienda: id_tienda || 'TODAS',
            data: {
                kpis: kpis[0],
                grafico_tendencia: tendencia,
                grafico_horarios: horarios,
                grafico_zonas: zonas,
                tabla_actividad_reciente: actividad
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/reportes', verificarToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                rep.id,
                rep.fecha,
                rep.duracion_segundos,
                t.nombre AS tienda,
                z.nombre AS zona,
                r.nombre AS nivel_riesgo,
                er.score,
                er.activa_camara,
                er.genera_alerta,
                ev.tipo_evento,
                s.modelo AS sensor,
                s.tipo AS tipo_sensor,
                g.id AS id_grabacion,
                g.ruta_enlace,
                g.estado_revision,
                g.es_sospechoso,
                c.modelo AS camara,
                ga.descripcion AS descripcion_ia,
                ga.genero,
                ga.edad,
                ga.comportamiento,
                ga.nivel_confianza
            FROM Reporte rep
            JOIN Tienda t ON rep.id_tienda = t.id
            JOIN Zona z ON rep.id_zona = z.id
            JOIN Riesgo r ON rep.id_riesgo = r.id
            JOIN EvaluacionRiesgo er ON rep.id_evaluacion = er.id
            JOIN EventoSensor ev ON er.id_evento = ev.id
            JOIN Sensor s ON ev.id_sensor = s.id
            LEFT JOIN Grabacion g ON g.id_reporte = rep.id
            LEFT JOIN Camara c ON g.id_camara = c.id
            LEFT JOIN GrabacionAnalisis ga ON ga.id_grabacion = g.id
            ORDER BY rep.fecha DESC
        `);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =========================
// CATALOGOS
// =========================
app.get('/api/usuarios', verificarToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.nombre, u.correo, r.nombre AS rol, t.nombre AS tienda, u.fecha_registro
            FROM Usuario u
            JOIN Rol r ON u.id_rol = r.id
            LEFT JOIN Tienda t ON u.id_tienda = t.id
            ORDER BY u.fecha_registro DESC
        `);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/tiendas', verificarToken, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM Tienda ORDER BY nombre ASC");
        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/riesgos', verificarToken, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM Riesgo ORDER BY id ASC");
        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/zonas', verificarToken, async (req, res) => {
    const { id_tienda } = req.query;

    try {
        const params = [];
        let query = `
            SELECT z.*, t.nombre AS tienda
            FROM Zona z
            JOIN Tienda t ON z.id_tienda = t.id
        `;

        if (id_tienda) {
            query += " WHERE z.id_tienda = ?";
            params.push(id_tienda);
        }

        query += " ORDER BY z.nombre ASC";

        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/sensores', verificarToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT s.*, z.nombre AS zona, es.nombre AS estado
            FROM Sensor s
            JOIN Zona z ON s.id_zona = z.id
            JOIN EstadoSensor es ON s.id_estado = es.id
            ORDER BY z.nombre ASC, s.modelo ASC
        `);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/camaras', verificarToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, z.nombre AS zona
            FROM Camara c
            JOIN Zona z ON c.id_zona = z.id
            ORDER BY z.nombre ASC, c.modelo ASC
        `);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
