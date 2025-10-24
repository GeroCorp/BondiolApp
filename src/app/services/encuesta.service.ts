import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EncuestaService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.SUPABASE_URL,
      environment.SUPABASE_ANON_KEY
    );
  }

  /**
   * ✅ NUEVA LÓGICA: Verifica si ya respondió la encuesta HOY
   * Permite múltiples encuestas en diferentes visitas
   */
  async yaRespondioEncuestaHoy(clienteId: number, mesaId: number): Promise<boolean> {
    try {
      console.log('🔍 Verificando encuesta de hoy para:', { clienteId, mesaId });

      // ✅ Validar parámetros
      if (!clienteId || !mesaId) {
        console.error('❌ Parámetros inválidos:', { clienteId, mesaId });
        return false;
      }

      // Obtener la fecha de hoy (inicio del día)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const inicioHoy = hoy.toISOString();

      console.log('📅 Buscando respuestas desde:', inicioHoy);

      // Buscar respuestas de hoy para esta mesa y cliente
      const { data, error } = await this.supabase
        .from('respuestas_encuesta')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('mesa_id', mesaId)
        .gte('fecha', inicioHoy);

      console.log('🔎 Respuestas de hoy encontradas:', {
        cliente_id: clienteId,
        mesa_id: mesaId,
        cantidad: data?.length || 0,
        respuestas: data
      });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error verificando encuesta:', error);
        return false;
      }

      const yaRespondio: boolean = !!(data && data.length > 0); // ✅ Tipo explícito
      console.log('✅ Ya respondió hoy:', yaRespondio);
      
      return yaRespondio;
    } catch (error) {
      console.error('❌ Error en yaRespondioEncuestaHoy:', error);
      return false;
    }
  }

  /**
   * MÉTODO ANTIGUO - Mantener por compatibilidad pero ya no se usa
   */
  async yaRespondiEncuesta(clienteId: number, mesaId: number): Promise<boolean> {
    try {
      console.log('🔍 Verificando encuesta para:', { clienteId, mesaId });

      // ✅ Validar parámetros
      if (!clienteId || !mesaId) {
        console.error('❌ Parámetros inválidos:', { clienteId, mesaId });
        return false;
      }

      // Primero verificar todas las respuestas del cliente
      const { data: todasRespuestas, error: errorTodas } = await this.supabase
        .from('respuestas_encuesta')
        .select('*')
        .eq('cliente_id', clienteId);

      console.log('📊 Todas las respuestas del cliente:', todasRespuestas);
      console.log('📊 Cantidad total de respuestas:', todasRespuestas?.length || 0);

      // Ahora verificar si hay respuesta para esta mesa específica
      const { data, error } = await this.supabase
        .from('respuestas_encuesta')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('mesa_id', mesaId);

      console.log('🔎 Query realizada para mesa específica:', {
        cliente_id: clienteId,
        mesa_id: mesaId,
        resultados: data,
        cantidadResultados: data?.length || 0,
        error: error
      });

      if (data && data.length > 0) {
        console.log('📝 Detalles de la(s) respuesta(s) encontrada(s):', data);
      }

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error verificando encuesta:', error);
        return false;
      }

      const yaRespondio: boolean = !!(data && data.length > 0); // ✅ Tipo explícito
      console.log('✅ Resultado verificación:', {
        yaRespondio,
        cantidadRespuestas: data?.length || 0,
        mesaEnRespuestas: data?.map(r => r.mesa_id)
      });
      
      return yaRespondio;
    } catch (error) {
      console.error('❌ Error en yaRespondiEncuesta:', error);
      return false;
    }
  }

  /**
   * Guarda las respuestas de la encuesta
   */
  async guardarRespuestas(
    clienteId: number,
    mesaId: number,
    respuestas: any
  ) {
    try {
      console.log('📝 Guardando encuesta:', {
        clienteId,
        mesaId,
        respuestas
      });

      // ✅ Validar todos los parámetros necesarios
      if (!clienteId) {
        throw new Error('ID de cliente no válido');
      }

      if (!mesaId) {
        throw new Error('ID de mesa no válido');
      }

      if (!respuestas.calidadComida || respuestas.calidadComida < 1 || respuestas.calidadComida > 5) {
        throw new Error('Calificación de comida inválida');
      }

      if (!respuestas.calidadServicio || respuestas.calidadServicio < 1 || respuestas.calidadServicio > 5) {
        throw new Error('Calificación de servicio inválida');
      }

      if (!respuestas.ambiente || respuestas.ambiente < 1 || respuestas.ambiente > 5) {
        throw new Error('Calificación de ambiente inválida');
      }

      if (!respuestas.precioCalidad || respuestas.precioCalidad < 1 || respuestas.precioCalidad > 5) {
        throw new Error('Calificación de precio-calidad inválida');
      }

      if (respuestas.recomendaria === null || respuestas.recomendaria === undefined) {
        throw new Error('Debe indicar si recomendaría el restaurante');
      }

      const dataToInsert = {
        cliente_id: clienteId,
        mesa_id: mesaId,
        calidad_comida: respuestas.calidadComida,
        calidad_servicio: respuestas.calidadServicio,
        ambiente: respuestas.ambiente,
        precio_calidad: respuestas.precioCalidad,
        recomendaria: respuestas.recomendaria,
        comentarios: respuestas.comentarios || null,
        fecha: new Date().toISOString()
      };

      console.log('📦 Data a insertar:', dataToInsert);

      const { data, error } = await this.supabase
        .from('respuestas_encuesta')
        .insert(dataToInsert)
        .select();

      if (error) {
        console.error('❌ Error de Supabase:', error);
        
        // Mensajes de error más específicos
        if (error.code === '23503') {
          throw new Error('Error de referencia: Cliente o mesa no válidos');
        } else if (error.code === '23505') {
          throw new Error('Ya existe una respuesta para esta mesa y cliente');
        } else {
          throw new Error(`Error al guardar: ${error.message}`);
        }
      }

      if (!data || data.length === 0) {
        throw new Error('No se pudo guardar la encuesta');
      }

      console.log('✅ Encuesta guardada correctamente:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error en guardarRespuestas:', error);
      throw error;
    }
  }

  /**
   * Obtiene los resultados agregados de todas las encuestas
   */
  async obtenerResultados() {
    try {
      console.log('📊 Obteniendo resultados de encuestas...');

      const { data, error } = await this.supabase
        .from('respuestas_encuesta')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo resultados:', error);
        throw error;
      }

      console.log('📈 Resultados obtenidos:', data?.length || 0, 'encuestas');

      return this.procesarResultados(data || []);
    } catch (error) {
      console.error('❌ Error en obtenerResultados:', error);
      throw error;
    }
  }

  /**
   * Procesa los resultados para gráficos
   */
  private procesarResultados(respuestas: any[]) {
    if (!respuestas || respuestas.length === 0) {
      console.log('⚠️ No hay encuestas para procesar');
      return {
        total: 0,
        promedios: {
          calidadComida: 0,
          calidadServicio: 0,
          ambiente: 0,
          precioCalidad: 0
        },
        recomendaria: {
          si: 0,
          no: 0,
          porcentajeSi: 0
        },
        distribucion: {
          calidadComida: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          calidadServicio: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          ambiente: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          precioCalidad: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      };
    }

    const total = respuestas.length;
    
    // Calcular promedios
    const sumaCalidadComida = respuestas.reduce((sum, r) => sum + (r.calidad_comida || 0), 0);
    const sumaCalidadServicio = respuestas.reduce((sum, r) => sum + (r.calidad_servicio || 0), 0);
    const sumaAmbiente = respuestas.reduce((sum, r) => sum + (r.ambiente || 0), 0);
    const sumaPrecioCalidad = respuestas.reduce((sum, r) => sum + (r.precio_calidad || 0), 0);

    // Contar recomendaciones
    const siRecomendaria = respuestas.filter(r => r.recomendaria === true).length;
    const noRecomendaria = total - siRecomendaria;

    // Distribución por estrellas
    const distribucion: any = {
      calidadComida: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      calidadServicio: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      ambiente: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      precioCalidad: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    respuestas.forEach(r => {
      if (r.calidad_comida) distribucion.calidadComida[r.calidad_comida]++;
      if (r.calidad_servicio) distribucion.calidadServicio[r.calidad_servicio]++;
      if (r.ambiente) distribucion.ambiente[r.ambiente]++;
      if (r.precio_calidad) distribucion.precioCalidad[r.precio_calidad]++;
    });

    const resultados = {
      total,
      promedios: {
        calidadComida: (sumaCalidadComida / total).toFixed(1),
        calidadServicio: (sumaCalidadServicio / total).toFixed(1),
        ambiente: (sumaAmbiente / total).toFixed(1),
        precioCalidad: (sumaPrecioCalidad / total).toFixed(1)
      },
      recomendaria: {
        si: siRecomendaria,
        no: noRecomendaria,
        porcentajeSi: ((siRecomendaria / total) * 100).toFixed(1)
      },
      distribucion
    };

    console.log('✅ Resultados procesados:', resultados);
    return resultados;
  }

  /**
   * Método de utilidad para debugging - eliminar respuestas de prueba
   * SOLO USAR EN DESARROLLO
   */
  async limpiarRespuestasCliente(clienteId: number, mesaId?: number) {
    try {
      console.log('🧹 Limpiando respuestas para:', { clienteId, mesaId });

      let query = this.supabase
        .from('respuestas_encuesta')
        .delete()
        .eq('cliente_id', clienteId);

      if (mesaId) {
        query = query.eq('mesa_id', mesaId);
      }

      const { data, error } = await query.select();

      if (error) {
        console.error('❌ Error limpiando respuestas:', error);
        throw error;
      }

      console.log('✅ Respuestas eliminadas:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en limpiarRespuestasCliente:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las respuestas de un cliente (para debugging)
   */
  async obtenerRespuestasCliente(clienteId: number) {
    try {
      const { data, error } = await this.supabase
        .from('respuestas_encuesta')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('fecha', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo respuestas:', error);
        throw error;
      }

      console.log('📋 Respuestas del cliente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en obtenerRespuestasCliente:', error);
      throw error;
    }
  }
}