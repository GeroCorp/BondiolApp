-- Configuraciones adicionales para lista de espera

-- 1. Crear vista para estadísticas de la lista de espera
CREATE OR REPLACE VIEW vista_estadisticas_espera AS
SELECT 
    DATE(fecha_registro) as fecha,
    COUNT(*) as total_clientes,
    COUNT(CASE WHEN estado = 'esperando' THEN 1 END) as esperando,
    COUNT(CASE WHEN estado = 'llamado' THEN 1 END) as llamados,
    COUNT(CASE WHEN estado = 'asignado' THEN 1 END) as asignados,
    COUNT(CASE WHEN estado = 'ausente' THEN 1 END) as ausentes,
    COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) as cancelados,
    AVG(EXTRACT(EPOCH FROM (fecha_asignacion - fecha_registro))/60) as tiempo_promedio_espera_minutos
FROM lista_espera
GROUP BY DATE(fecha_registro)
ORDER BY fecha DESC;

-- 2. Función para limpiar registros antiguos (más de 7 días)
CREATE OR REPLACE FUNCTION limpiar_lista_espera_antigua()
RETURNS INTEGER AS $$
DECLARE
    registros_eliminados INTEGER;
BEGIN
    DELETE FROM lista_espera 
    WHERE fecha_registro < NOW() - INTERVAL '7 days'
    AND estado IN ('asignado', 'ausente', 'cancelado');
    
    GET DIAGNOSTICS registros_eliminados = ROW_COUNT;
    RETURN registros_eliminados;
END;
$$ LANGUAGE plpgsql;

-- 3. Función para obtener posición en la cola
CREATE OR REPLACE FUNCTION obtener_posicion_cola(turno_cliente INTEGER)
RETURNS INTEGER AS $$
DECLARE
    posicion INTEGER;
BEGIN
    SELECT COUNT(*) + 1 
    INTO posicion
    FROM lista_espera 
    WHERE numero_turno < turno_cliente 
    AND estado = 'esperando'
    AND DATE(fecha_registro) = CURRENT_DATE;
    
    RETURN posicion;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para estimar tiempo de espera
CREATE OR REPLACE FUNCTION estimar_tiempo_espera(turno_cliente INTEGER)
RETURNS INTEGER AS $$
DECLARE
    clientes_adelante INTEGER;
    tiempo_promedio FLOAT;
    tiempo_estimado INTEGER;
BEGIN
    -- Contar clientes adelante en la cola
    SELECT COUNT(*) 
    INTO clientes_adelante
    FROM lista_espera 
    WHERE numero_turno < turno_cliente 
    AND estado = 'esperando'
    AND DATE(fecha_registro) = CURRENT_DATE;
    
    -- Obtener tiempo promedio de los últimos 10 clientes asignados
    SELECT AVG(EXTRACT(EPOCH FROM (fecha_asignacion - fecha_registro))/60)
    INTO tiempo_promedio
    FROM lista_espera 
    WHERE estado = 'asignado'
    AND fecha_asignacion > NOW() - INTERVAL '2 hours'
    LIMIT 10;
    
    -- Si no hay datos históricos, usar 15 minutos por defecto
    IF tiempo_promedio IS NULL THEN
        tiempo_promedio := 15;
    END IF;
    
    tiempo_estimado := (clientes_adelante * tiempo_promedio)::INTEGER;
    
    RETURN tiempo_estimado;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para registrar cambios de estado
CREATE TABLE IF NOT EXISTS lista_espera_historial (
    id BIGSERIAL PRIMARY KEY,
    lista_espera_id BIGINT REFERENCES lista_espera(id),
    estado_anterior VARCHAR(20),
    estado_nuevo VARCHAR(20),
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notas TEXT
);

CREATE OR REPLACE FUNCTION registrar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO lista_espera_historial (lista_espera_id, estado_anterior, estado_nuevo, notas)
        VALUES (NEW.id, OLD.estado, NEW.estado, 'Cambio automático de estado');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cambio_estado
    AFTER UPDATE ON lista_espera
    FOR EACH ROW
    EXECUTE FUNCTION registrar_cambio_estado();

-- 6. Función para notificaciones en tiempo real (usar con Supabase Realtime)
CREATE OR REPLACE FUNCTION notificar_cambio_lista_espera()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('lista_espera_cambios', 
        json_build_object(
            'operation', TG_OP,
            'record', row_to_json(NEW),
            'old_record', row_to_json(OLD)
        )::text
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notificar_cambios
    AFTER INSERT OR UPDATE OR DELETE ON lista_espera
    FOR EACH ROW
    EXECUTE FUNCTION notificar_cambio_lista_espera();