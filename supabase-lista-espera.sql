-- Crear tabla para lista de espera
CREATE TABLE lista_espera (
    id BIGSERIAL PRIMARY KEY,
    numero_turno INTEGER NOT NULL,
    nombre_cliente VARCHAR(100) NOT NULL,
    cantidad_personas INTEGER NOT NULL DEFAULT 1,
    telefono VARCHAR(20),
    email VARCHAR(100),
    estado VARCHAR(20) NOT NULL DEFAULT 'esperando',
    qr_code VARCHAR(50) UNIQUE NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_llamada TIMESTAMP WITH TIME ZONE,
    fecha_asignacion TIMESTAMP WITH TIME ZONE,
    mesa_asignada INTEGER,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_lista_espera_numero_turno ON lista_espera(numero_turno);
CREATE INDEX idx_lista_espera_estado ON lista_espera(estado);
CREATE INDEX idx_lista_espera_qr_code ON lista_espera(qr_code);
CREATE INDEX idx_lista_espera_fecha_registro ON lista_espera(fecha_registro);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para updated_at
CREATE TRIGGER update_lista_espera_updated_at
    BEFORE UPDATE ON lista_espera
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Crear función para obtener siguiente número de turno
CREATE OR REPLACE FUNCTION obtener_siguiente_turno()
RETURNS INTEGER AS $$
DECLARE
    siguiente_turno INTEGER;
BEGIN
    SELECT COALESCE(MAX(numero_turno), 0) + 1 
    INTO siguiente_turno 
    FROM lista_espera 
    WHERE DATE(fecha_registro) = CURRENT_DATE;
    
    RETURN siguiente_turno;
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar código QR único
CREATE OR REPLACE FUNCTION generar_codigo_qr()
RETURNS VARCHAR(50) AS $$
DECLARE
    codigo_qr VARCHAR(50);
    existe BOOLEAN;
BEGIN
    LOOP
        -- Generar código de 8 caracteres alfanuméricos
        codigo_qr := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Verificar si ya existe
        SELECT EXISTS(SELECT 1 FROM lista_espera WHERE qr_code = codigo_qr) INTO existe;
        
        -- Si no existe, salir del loop
        IF NOT existe THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN codigo_qr;
END;
$$ LANGUAGE plpgsql;

-- Insertar algunos datos de ejemplo (opcional)
INSERT INTO lista_espera (numero_turno, nombre_cliente, cantidad_personas, telefono, estado, qr_code) VALUES
(1, 'Juan Pérez', 2, '+5491234567890', 'esperando', generar_codigo_qr()),
(2, 'María García', 4, '+5491234567891', 'esperando', generar_codigo_qr()),
(3, 'Carlos López', 3, '+5491234567892', 'llamado', generar_codigo_qr());

-- Configurar Row Level Security (RLS) si es necesario
ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ajustar según necesidades de seguridad)
CREATE POLICY "Allow all operations on lista_espera" ON lista_espera
    FOR ALL USING (true);

-- Comentarios sobre los estados posibles:
-- 'esperando': Cliente en lista de espera
-- 'llamado': Cliente llamado, esperando respuesta
-- 'asignado': Mesa asignada al cliente
-- 'ausente': Cliente no respondió al llamado
-- 'cancelado': Cliente canceló su turno