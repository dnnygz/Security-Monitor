SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE GrabacionAnalisis;
TRUNCATE TABLE Grabacion;
TRUNCATE TABLE Reporte;
TRUNCATE TABLE EvaluacionRiesgo;
TRUNCATE TABLE EventoSensor;
TRUNCATE TABLE Usuario;
TRUNCATE TABLE Sensor;
TRUNCATE TABLE Camara;
TRUNCATE TABLE Zona;
TRUNCATE TABLE EstadoSensor;
TRUNCATE TABLE Rol;
TRUNCATE TABLE Riesgo;
TRUNCATE TABLE Tienda;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO Riesgo (id, nombre) VALUES
  (1, 'BAJO'),
  (2, 'MEDIO'),
  (3, 'ALTO');

INSERT INTO EstadoSensor (id, nombre) VALUES
  (1, 'ACTIVO'),
  (2, 'INACTIVO'),
  (3, 'MANTENIMIENTO');

INSERT INTO Rol (id, nombre, descripcion) VALUES
  (1, 'ADMIN', 'Administrador global del sistema'),
  (2, 'OPERADOR', 'Operador de monitoreo de tienda');

INSERT INTO Tienda (id, nombre, ubicacion) VALUES
  (1, 'Tienda Central Miraflores', 'Av. Larco 123, Miraflores'),
  (2, 'Tienda Norte Los Olivos', 'Av. Universitaria 4500, Los Olivos');

INSERT INTO Zona (id, nombre, descripcion, id_tienda) VALUES
  (1, 'Entrada Principal', 'Acceso frontal y torniquetes', 1),
  (2, 'Pasillo Bebidas', 'Pasillo de bebidas y congelados', 1),
  (3, 'Caja Rapida', 'Zona de cajas express', 1),
  (4, 'Almacen', 'Ingreso interno de mercaderia', 2);

INSERT INTO Camara (id, id_zona, modelo) VALUES
  (1, 1, 'Hikvision DS-2CD2143'),
  (2, 2, 'Dahua IPC-HFW2431'),
  (3, 3, 'Axis M2026-LE'),
  (4, 4, 'Hikvision DS-2CD2087');

INSERT INTO Sensor (id, id_zona, id_estado, tipo, modelo) VALUES
  (1, 1, 1, 'MOVIMIENTO', 'PIR-X100'),
  (2, 2, 1, 'MOVIMIENTO', 'PIR-X200'),
  (3, 3, 1, 'APERTURA', 'DOOR-S10'),
  (4, 4, 3, 'VIBRACION', 'VIB-A7');

INSERT INTO Usuario (id, nombre, correo, contrasena, id_rol, id_tienda) VALUES
  (1, 'Admin Demo', 'admin@security.local', '$2a$10$DjOn6YQaJZHg/reh4jKaJOde.MgiotbEdEOKBEPEsuiFUPi2CZDU2', 1, NULL),
  (2, 'Operador Miraflores', 'operador@security.local', '$2a$10$DjOn6YQaJZHg/reh4jKaJOde.MgiotbEdEOKBEPEsuiFUPi2CZDU2', 2, 1);

INSERT INTO EventoSensor (id, id_sensor, id_zona, tipo_evento, fecha, duracion_segundos) VALUES
  (1, 1, 1, 'MOVIMIENTO', NOW() - INTERVAL 2 HOUR, 12),
  (2, 2, 2, 'MOVIMIENTO', NOW() - INTERVAL 1 HOUR, 38),
  (3, 3, 3, 'APERTURA', NOW() - INTERVAL 45 MINUTE, 6),
  (4, 1, 1, 'MOVIMIENTO', NOW() - INTERVAL 20 MINUTE, 55),
  (5, 4, 4, 'VIBRACION', NOW() - INTERVAL 8 MINUTE, 18);

INSERT INTO EvaluacionRiesgo (id, id_evento, score, id_riesgo, fecha, activa_camara, genera_alerta) VALUES
  (1, 1, 3, 1, NOW() - INTERVAL 2 HOUR, FALSE, FALSE),
  (2, 2, 6, 2, NOW() - INTERVAL 1 HOUR, TRUE, FALSE),
  (3, 3, 2, 1, NOW() - INTERVAL 45 MINUTE, FALSE, FALSE),
  (4, 4, 9, 3, NOW() - INTERVAL 20 MINUTE, TRUE, TRUE),
  (5, 5, 7, 2, NOW() - INTERVAL 8 MINUTE, TRUE, FALSE);

INSERT INTO Reporte (id, id_tienda, id_zona, id_riesgo, fecha, duracion_segundos, id_evaluacion) VALUES
  (1, 1, 1, 1, NOW() - INTERVAL 2 HOUR, 12, 1),
  (2, 1, 2, 2, NOW() - INTERVAL 1 HOUR, 38, 2),
  (3, 1, 3, 1, NOW() - INTERVAL 45 MINUTE, 6, 3),
  (4, 1, 1, 3, NOW() - INTERVAL 20 MINUTE, 55, 4),
  (5, 2, 4, 2, NOW() - INTERVAL 8 MINUTE, 18, 5);

INSERT INTO Grabacion (id, id_camara, ruta_enlace, id_reporte, fecha, tipo, estado_revision, es_sospechoso) VALUES
  (1, 1, '/recordings/entrada-001.mp4', 1, NOW() - INTERVAL 2 HOUR, 'EVENTO', 'REVISADO', FALSE),
  (2, 2, '/recordings/bebidas-002.mp4', 2, NOW() - INTERVAL 1 HOUR, 'EVENTO', 'PENDIENTE', TRUE),
  (3, 3, '/recordings/caja-003.mp4', 3, NOW() - INTERVAL 45 MINUTE, 'EVENTO', 'DESCARTADO', FALSE),
  (4, 1, '/recordings/entrada-004.mp4', 4, NOW() - INTERVAL 20 MINUTE, 'EVENTO', 'PENDIENTE', TRUE),
  (5, 4, '/recordings/almacen-005.mp4', 5, NOW() - INTERVAL 8 MINUTE, 'EVENTO', 'PENDIENTE', FALSE);

INSERT INTO GrabacionAnalisis (id, id_grabacion, descripcion, genero, edad, comportamiento, nivel_confianza) VALUES
  (1, 1, 'Sujeto con casaca azul y mochila negra cruza el acceso principal sin detenerse.', 'MASCULINO', 32, 'NORMAL', 'MEDIO'),
  (2, 2, 'Sujeto con polo claro permanece frente al anaquel y revisa repetidamente su entorno.', 'FEMENINO', 27, 'MERODEO', 'ALTO'),
  (3, 3, 'Sujeto con ropa oscura realiza pago en caja rapida sin conducta anomala visible.', 'DESCONOCIDO', 40, 'NORMAL', 'BAJO'),
  (4, 4, 'Sujeto con gorra y mochila se mantiene cerca de la entrada con movimientos repetitivos.', 'MASCULINO', 24, 'SOSPECHOSO', 'ALTO'),
  (5, 5, 'Sujeto no identificado con prenda gris se aproxima al acceso de almacen fuera del flujo habitual.', 'DESCONOCIDO', 35, 'INDETERMINADO', 'MEDIO');
