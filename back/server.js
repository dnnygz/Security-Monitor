require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const ROLES = {
    ADMIN_GLOBAL: 1,
    GERENTE_TIENDA: 2,
    OPERADOR_SEGURIDAD: 3,
    AUDITOR: 4,
    SERVICIO_AUTO: 5
};

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
app.post('/api/auth/tokens', async (req, res) => {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
        return res.status(400).json({ success: false, message: "Faltan datos" });
    }

    try {
        const [rows] = await pool.query(
            `SELECT 
                u.id,
                u.nombre,
                u.correo,
                u.contrasena,
                u.id_rol,
                u.id_tienda,
                r.nombre AS rol,
                t.nombre AS tienda
            FROM Usuario u
            JOIN Rol r ON u.id_rol = r.id
            LEFT JOIN Tienda t ON u.id_tienda = t.id
            WHERE u.correo = ?`,
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
                correo: user.correo,
                id_rol: user.id_rol,
                rol: user.rol,
                rol_codigo: user.rol,
                id_tienda: user.id_tienda,
                tienda: user.tienda
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// MIDDLEWARE: VERIFICAR JWT
// ==========================================
const verificarToken = (req, res, next) => {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {

        const datosVerificados = jwt.verify(token, process.env.JWT_SECRET);

        req.usuarioAutenticado = datosVerificados;

        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Token inválido o expirado.' });
    }
};

// ==========================================
// MIDDLEWARE: CONTROL DE ROLES (RBAC)
// ==========================================
const requerirRoles =  (rolesPermitidos) => {
    return (req, res, next) => {
        const { id_rol } = req.usuarioAutenticado;
        if (!rolesPermitidos.includes(parseInt(id_rol))) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. No tienes los privilegios requeridos.'
            });
        }
        next();
    };
};

const requerirTiendaAsignada = (req, res, next) => {
    if (!req.usuarioAutenticado.id_tienda) {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Tu usuario no tiene una tienda asignada.'
        });
    }
    next();
};

/**
 * ==========================================================================
 * ENDPOINT EXCLUSIVO PARA ADMINISTRADOR GLOBAL: CREACIÓN DE USUARIOS
 * ==========================================================================
 * Permite registrar cualquier tipo de usuario (Admin, Gerente, Operador, etc.)
 * y asignarlo a cualquier tienda (o dejarlo como NULL).
 */
app.post('/api/admin/usuarios', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL]), requerirTiendaAsignada, async (req, res) => {
    const { nombre, correo, contrasena, id_rol } = req.body;
    const { id_tienda } = req.usuarioAutenticado;

    // Validación de campos obligatorios para el registro
    if (!nombre || !correo || !contrasena || !id_rol) {
        return res.status(400).json({ 
            success: false, 
            message: 'Los campos nombre, correo, contrasena e id_rol son obligatorios.' 
        });
    }

    try {
        // 1. Verificar si el correo electrónico ya existe en la base de datos
        const [usuariosExistentes] = await pool.query(
            'SELECT id FROM Usuario WHERE correo = ?', 
            [correo]
        );
        
        if (usuariosExistentes.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El correo electrónico ya se encuentra registrado.' 
            });
        }

        // 2. Hashear la contraseña por seguridad antes de guardarla
        const salt = await bcrypt.genSalt(10);
        const contrasenaHasheada = await bcrypt.hash(contrasena, salt);

        // 3. Insertar el nuevo usuario en la base de datos
        // Si id_tienda no viene en el body o es vacío, se guarda como NULL automáticamente
        const queryInsert = `
            INSERT INTO Usuario (nombre, correo, contrasena, id_rol, id_tienda) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const [resultado] = await pool.query(queryInsert, [
            nombre,
            correo,
            contrasenaHasheada,
            id_rol,
            id_tienda || null 
        ]);

        // 4. Responder con éxito y retornar el ID generado
        res.status(201).json({
            success: true,
            message: 'Usuario registrado globalmente de forma exitosa.',
            data: {
                id_usuario_creado: resultado.insertId,
                nombre,
                correo,
                id_rol,
                id_tienda: id_tienda || null
            }
        });

    } catch (error) {
        console.error('Error en el registro global de usuario:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});


/**
 * Endpoint Exclusivo para Administrador Global
 * Permite modificar absolutamente todos los campos de cualquier usuario
 */
app.put('/api/admin/usuarios/:id', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL]), requerirTiendaAsignada, async (req, res) => {
    const { id } = req.params;
    // El administrador SI puede cambiar el rol y la tienda asignada
    const { nombre, correo, contrasena, id_rol } = req.body; 
    const { id_tienda } = req.usuarioAutenticado;

    if (!nombre || !correo || !id_rol) {
        return res.status(400).json({ success: false, message: 'Campos obligatorios faltantes.' });
    }

    try {
        // Validar correo duplicado
        const [correoExistente] = await pool.query('SELECT id FROM Usuario WHERE correo = ? AND id != ?', [correo, id]);
        if (correoExistente.length > 0) {
            return res.status(400).json({ success: false, message: 'El correo ya está en uso.' });
        }

        let queryUpdate = '';
        let queryParams = [];

        if (contrasena && contrasena.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const contrasenaHasheada = await bcrypt.hash(contrasena, salt);
            
            queryUpdate = `
                UPDATE Usuario 
                SET nombre = ?, correo = ?, contrasena = ?, id_rol = ?, id_tienda = ? 
                WHERE id = ? AND id_tienda = ?
            `;
            queryParams = [nombre, correo, contrasenaHasheada, id_rol, id_tienda, id, id_tienda];
        } else {
            queryUpdate = `
                UPDATE Usuario 
                SET nombre = ?, correo = ?, id_rol = ?, id_tienda = ? 
                WHERE id = ? AND id_tienda = ?
            `;
            queryParams = [nombre, correo, id_rol, id_tienda, id, id_tienda];
        }

        const [resultado] = await pool.query(queryUpdate, queryParams);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        res.json({ success: true, message: 'Usuario modificado globalmente con éxito.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/admin/usuarios/:id', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL]), requerirTiendaAsignada, async (req, res) => {
    const { id } = req.params;
    const { id_usuario: adminId } = req.usuarioAutenticado; // ID del admin que inició sesión
    const { id_tienda } = req.usuarioAutenticado;

    // Candado de Seguridad: Evitar que el administrador se elimine a sí mismo por error
    if (parseInt(id) === parseInt(adminId)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Operación inválida. No puedes eliminar tu propia cuenta de Administrador Global.' 
        });
    }

    try {
        // Ejecutar la eliminación directa en la base de datos
        const [resultado] = await pool.query('DELETE FROM Usuario WHERE id = ? AND id_tienda = ?', [id, id_tienda]);

        // Si no se afectó ninguna fila, significa que el ID no existía
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado.' 
            });
        }

        res.json({
            success: true,
            message: 'Usuario eliminado globalmente de la base de datos de manera exitosa.'
        });

    } catch (error) {
        console.error('Error al eliminar usuario (Global):', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/usuarios/empleados', verificarToken, requerirRoles([ROLES.GERENTE_TIENDA]), requerirTiendaAsignada, async (req, res) => {

    const { id_tienda: tiendaAdmin } = req.usuarioAutenticado;
    // requisitos para crear la cuenta (nombre, correo y contraseña)
    const { nombre, correo, contrasena } = req.body;

    if (!nombre || !correo || !contrasena) {
        return res.status(400).json({ 
            success: false, 
            message: 'Todos los campos (nombre, correo, contrasena) son obligatorios.' 
        });
    }

    try {
        const [usuariosExistentes] = await pool.query('SELECT id FROM Usuario WHERE correo = ?', [correo]);
        if (usuariosExistentes.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El correo electrónico ya se encuentra registrado.' 
            });
        }

        const salt = await bcrypt.genSalt(10);
        const contrasenaHasheada = await bcrypt.hash(contrasena, salt);

        const ID_ROL_USUARIO = ROLES.OPERADOR_SEGURIDAD;

        const queryInsert = `
            INSERT INTO Usuario (nombre, correo, contrasena, id_rol, id_tienda) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const [resultado] = await pool.query(queryInsert, [
            nombre,
            correo,
            contrasenaHasheada,
            ID_ROL_USUARIO,
            tiendaAdmin // token del admin
        ]);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente dentro de tu misma tienda.',
            id_usuario_creado: resultado.insertId
        });

    } catch (error) {
        console.error('Error en el registro de empleado:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/usuarios/empleados/:id', verificarToken, requerirRoles([ROLES.GERENTE_TIENDA]), requerirTiendaAsignada, async (req, res) => {
    const { id } = req.params;
    // 1. Eliminamos 'id_rol' de req.body para que NINGÚN usuario pueda enviarlo ni alterarlo
    const { nombre, correo, contrasena } = req.body; 
    const { id_tienda: tiendaAdmin } = req.usuarioAutenticado;

    // El id_rol ya no es obligatorio porque ya no se va a actualizar aquí
    if (!nombre || !correo) {
        return res.status(400).json({ 
            success: false, 
            message: 'Los campos nombre y correo son obligatorios.' 
        });
    }

    try {
        // Verificar si el correo ya está en uso por OTRO usuario
        const [correoExistente] = await pool.query(
            'SELECT id FROM Usuario WHERE correo = ? AND id != ?', 
            [correo, id]
        );
      
        if (correoExistente.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El correo electrónico ya está asignado a otro usuario.' 
            });
        }

        let queryUpdate = '';
        let queryParams = [];

        // Si se envió una nueva contraseña, la hasheamos y actualizamos
        if (contrasena && contrasena.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const contrasenaHasheada = await bcrypt.hash(contrasena, salt);
            
            // 2. Quitamos 'id_rol = ?' de la sentencia SQL
            queryUpdate = `
                UPDATE Usuario 
                SET nombre = ?, correo = ?, contrasena = ?, id_tienda = ?
                WHERE id = ? AND id_tienda = ?
            `;
            queryParams = [nombre, correo, contrasenaHasheada, tiendaAdmin, id, tiendaAdmin];
        } else {
            // 3. Quitamos 'id_rol = ?' también de la sentencia sin contraseña
            queryUpdate = `
                UPDATE Usuario 
                SET nombre = ?, correo = ?, id_tienda = ?
                WHERE id = ? AND id_tienda = ?
            `;
            queryParams = [nombre, correo, tiendaAdmin, id, tiendaAdmin];
        }

        const [resultado] = await pool.query(queryUpdate, queryParams);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        res.json({
            success: true,
            message: 'Datos personales del usuario actualizados exitosamente sin alterar su rol.'
        });
    } catch (error) {
        console.error('Error al modificar usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/usuarios/empleados/:id', verificarToken, requerirRoles([ROLES.GERENTE_TIENDA]), requerirTiendaAsignada, async (req, res) => {
    const { id } = req.params;
    const { id_usuario: adminId } = req.usuarioAutenticado;
    const { id_tienda } = req.usuarioAutenticado;

    // Evitar que el administrador se elimine a sí mismo por error
    if (parseInt(id) === parseInt(adminId)) {
        return res.status(400).json({ 
            success: false, 
            message: 'No puedes eliminar tu propia cuenta de administrador desde este endpoint.' 
        });
    }

    try {
        const [resultado] = await pool.query('DELETE FROM Usuario WHERE id = ? AND id_tienda = ?', [id, id_tienda]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente de la base de datos.'
        });

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================
// EVENT CORE (CEREBRO)
// =========================
app.post('/api/sensores/:id/eventos', verificarToken, requerirRoles([ROLES.SERVICIO_AUTO]), requerirTiendaAsignada, async (req, res) => {
    const { id } = req.params;
    const {id_zona, tipo_evento, fecha, duracion_segundos } = req.body;
    const { id_tienda } = req.usuarioAutenticado;

    if (!id || !id_zona || !tipo_evento || !fecha) {
        return res.status(400).json({ success: false, message: "Faltan datos" });
    }

    try {
        const [sensorRows] = await pool.query(
            `SELECT s.id 
             FROM Sensor s
             JOIN Zona z ON s.id_zona = z.id
             WHERE s.id = ? AND z.id = ? AND z.id_tienda = ?`,
            [id, id_zona, id_tienda]
        );

        if (sensorRows.length === 0) {
            return res.status(403).json({ success: false, message: 'Sensor o zona fuera de tu tienda asignada.' });
        }

        // 1. guardar evento
        const [ev] = await pool.query(
            `INSERT INTO EventoSensor (id_sensor, id_zona, tipo_evento, fecha, duracion_segundos)
             VALUES (?, ?, ?, ?, ?)`,
            [id, id_zona, tipo_evento, fecha, duracion_segundos || 0]
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

        res.status(201).json({
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

app.get('/api/eventos-sensores', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.OPERADOR_SEGURIDAD, ROLES.AUDITOR]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;
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
	    WHERE z.id_tienda = ?
            ORDER BY ev.fecha DESC
        `, [id_tienda]);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =========================
// GRABACIONES (EVIDENCIA)
// =========================
app.get('/api/grabaciones', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.OPERADOR_SEGURIDAD, ROLES.AUDITOR]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;
    try {
        const [rows] = await pool.query(`
            SELECT g.*, c.modelo AS camara, z.nombre AS zona
            FROM Grabacion g
            JOIN Camara c ON g.id_camara = c.id
            JOIN Zona z ON c.id_zona = z.id
	    WHERE z.id_tienda = ?
            ORDER BY g.fecha DESC
        `, [id_tienda]);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.patch('/api/grabaciones/:id', verificarToken,requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.OPERADOR_SEGURIDAD]), requerirTiendaAsignada,  async (req, res) => {
    const { id } = req.params;
    const { estado_revision } = req.body;
    const { id_tienda } = req.usuarioAutenticado;
    const estadosPermitidos = ['PENDIENTE', 'REVISADO', 'DESCARTADO'];

    if (!estado_revision || !estadosPermitidos.includes(estado_revision)) {
        return res.status(400).json({
            success: false,
            message: "estado_revision debe ser PENDIENTE, REVISADO o DESCARTADO"
        });
    }

    try {
        const [result] = await pool.query(
            `UPDATE Grabacion g
             JOIN Camara c ON g.id_camara = c.id
             JOIN Zona z ON c.id_zona = z.id
             SET g.estado_revision = ?
             WHERE g.id = ? AND z.id_tienda = ?`,
            [estado_revision, id, id_tienda]
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
app.post('/api/grabaciones/:id/analisis', verificarToken, requerirRoles([ROLES.SERVICIO_AUTO]), requerirTiendaAsignada, async (req, res) => {
    const { id } = req.params;
    const { descripcion, genero, edad, comportamiento, nivel_confianza } = req.body;
    const { id_tienda } = req.usuarioAutenticado;

    try {
        const [recordingRows] = await pool.query(
            `SELECT g.id
             FROM Grabacion g
             JOIN Camara c ON g.id_camara = c.id
             JOIN Zona z ON c.id_zona = z.id
             WHERE g.id = ? AND z.id_tienda = ?`,
            [id, id_tienda]
        );

        if (recordingRows.length === 0) {
            return res.status(403).json({ success: false, message: 'Grabación fuera de tu tienda asignada.' });
        }

        const [r] = await pool.query(
            `INSERT INTO GrabacionAnalisis
            (id_grabacion, descripcion, genero, edad, comportamiento, nivel_confianza)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [id, descripcion, genero, edad, comportamiento, nivel_confianza]
        );

        res.status(201).json({ success: true, id: r.insertId });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/grabaciones/analisis', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.AUDITOR]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;
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
	    WHERE z.id_tienda = ?
            ORDER BY ga.id DESC
        `, [id_tienda]);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =========================
// DASHBOARD (BI)
// =========================
app.get('/api/tiendas/kpis', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.AUDITOR]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;

    try {
        const [[kpis]] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM EventoSensor WHERE id_zona IN (SELECT id FROM Zona WHERE id_tienda = ?)) AS eventos,
                (SELECT COUNT(*) FROM EvaluacionRiesgo WHERE id_evento IN (SELECT id FROM EventoSensor WHERE id_zona IN (SELECT id FROM Zona WHERE id_tienda = ?)) AND genera_alerta = 1) AS alertas,
                (SELECT COUNT(*) FROM Grabacion WHERE id_camara IN (SELECT id FROM Camara WHERE id_zona IN (SELECT id FROM Zona WHERE id_tienda = ?))) AS grabaciones
        `, [id_tienda, id_tienda, id_tienda]);

        res.json({ success: true, kpis });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// /api/dashboard/metricas
app.get('/api/reportes/estadisticas', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.AUDITOR]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;

    try {
        const [
            [kpis],
            [tendencia],
            [horarios],
            [zonas],
            [actividad]
        ] = await Promise.all([
            pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM Reporte WHERE id_tienda = ?) AS total_reportes,
                    (SELECT COUNT(*) FROM EvaluacionRiesgo er JOIN EventoSensor ev ON er.id_evento = ev.id JOIN Zona z ON ev.id_zona = z.id WHERE z.id_tienda = ? AND er.genera_alerta = TRUE) AS alertas_criticas,
                    (SELECT COUNT(*) FROM Sensor s JOIN Zona z ON s.id_zona = z.id WHERE z.id_tienda = ? AND s.id_estado = 1) AS sensores_activos,
                    (SELECT IFNULL(AVG(duracion_segundos), 0) FROM Reporte WHERE id_tienda = ?) AS tiempo_promedio_resolucion
            `, [id_tienda, id_tienda, id_tienda, id_tienda]),
            pool.query(`
                SELECT DATE(fecha) AS dia, COUNT(*) AS total
                FROM Reporte
                WHERE id_tienda = ? AND fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(fecha)
                ORDER BY dia ASC
            `, [id_tienda]),
            pool.query(`
                SELECT HOUR(fecha) AS hora, COUNT(*) AS total_incidentes
                FROM Reporte
                WHERE id_tienda = ?
                GROUP BY HOUR(fecha)
                ORDER BY hora ASC
            `, [id_tienda]),
            pool.query(`
                SELECT z.nombre AS zona, COUNT(rep.id) AS total_incidentes
                FROM Reporte rep
                JOIN Zona z ON rep.id_zona = z.id
                WHERE rep.id_tienda = ?
                GROUP BY rep.id_zona, z.nombre
                ORDER BY total_incidentes DESC
            `, [id_tienda]),
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
                WHERE rep.id_tienda = ?
                ORDER BY rep.fecha DESC
                LIMIT 6
            `, [id_tienda])
        ]);

        res.json({
            success: true,
            filtrado_por_tienda: id_tienda,
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

app.get('/api/reportes', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.OPERADOR_SEGURIDAD, ROLES.AUDITOR]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;
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
            WHERE z.id_tienda = ?
	    ORDER BY rep.fecha DESC
        `, [id_tienda]);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =========================
// CATALOGOS
// =========================
app.get('/api/usuarios', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.nombre, u.correo, u.id_rol, r.nombre AS rol, u.id_tienda, t.nombre AS tienda, u.fecha_registro
            FROM Usuario u
            JOIN Rol r ON u.id_rol = r.id
            LEFT JOIN Tienda t ON u.id_tienda = t.id
            WHERE u.id_tienda = ?
            ORDER BY u.fecha_registro DESC
        `, [id_tienda]);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/roles', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA]), async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM Rol ORDER BY id ASC");
        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/tiendas', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.AUDITOR]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;
    try {
        const [rows] = await pool.query("SELECT * FROM Tienda WHERE id = ? ORDER BY nombre ASC", [id_tienda]);
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

app.get('/api/zonas', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.OPERADOR_SEGURIDAD, ROLES.AUDITOR]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;

    try {
        const [rows] = await pool.query(`
            SELECT z.*, t.nombre AS tienda
            FROM Zona z
            JOIN Tienda t ON z.id_tienda = t.id
            WHERE z.id_tienda = ?
            ORDER BY z.nombre ASC
        `, [id_tienda]);
        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/sensores', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.OPERADOR_SEGURIDAD, ROLES.AUDITOR]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;
    try {
        const [rows] = await pool.query(`
            SELECT s.*, z.nombre AS zona, es.nombre AS estado
            FROM Sensor s
            JOIN Zona z ON s.id_zona = z.id
            JOIN EstadoSensor es ON s.id_estado = es.id
            WHERE z.id_tienda = ?
            ORDER BY z.nombre ASC, s.modelo ASC
        `, [id_tienda]);

        res.json({ success: true, data: rows });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/camaras', verificarToken, requerirRoles([ROLES.ADMIN_GLOBAL, ROLES.GERENTE_TIENDA, ROLES.OPERADOR_SEGURIDAD, ROLES.AUDITOR]), requerirTiendaAsignada, async (req, res) => {
    const { id_tienda } = req.usuarioAutenticado;
    try {
        const [rows] = await pool.query(`
            SELECT c.*, z.nombre AS zona
            FROM Camara c
            JOIN Zona z ON c.id_zona = z.id
            WHERE z.id_tienda = ?
            ORDER BY z.nombre ASC, c.modelo ASC
        `, [id_tienda]);

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
