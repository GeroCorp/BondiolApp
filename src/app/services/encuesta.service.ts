import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from './auth'; // ✅ Importar instancia centralizada

@Injectable({
  providedIn: 'root'
})
export class EncuestaService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabaseClient; // ✅ Usar instancia centralizada
  }

  /**
   * ✅ Obtener resultados de encuestas
   * TODOS pueden ver resultados (anónimos y registrados)
   */
  async obtenerResultados() {
  try {
    console.log('📊 Obteniendo resultados de encuestas...');

    // ✅ Obtener TODAS las respuestas (incluyendo anónimos donde cliente_id es NULL)
    const { data, error } = await this.supabase
      .from('respuestas_encuesta')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo resultados:', error);
      throw error;
    }

    console.log('📈 Resultados obtenidos:', data?.length || 0, 'encuestas');
    console.log('📋 Desglose:', {
      total: data?.length || 0,
      registrados: data?.filter(r => r.cliente_id !== null).length || 0,
      anonimos: data?.filter(r => r.cliente_id === null).length || 0
    });

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
    
    const sumaCalidadComida = respuestas.reduce((sum, r) => sum + (r.calidad_comida || 0), 0);
    const sumaCalidadServicio = respuestas.reduce((sum, r) => sum + (r.calidad_servicio || 0), 0);
    const sumaAmbiente = respuestas.reduce((sum, r) => sum + (r.ambiente || 0), 0);
    const sumaPrecioCalidad = respuestas.reduce((sum, r) => sum + (r.precio_calidad || 0), 0);

    const siRecomendaria = respuestas.filter(r => r.recomendaria === true).length;
    const noRecomendaria = total - siRecomendaria;

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

  // ✅ CORREGIDO: Método para guardar respuesta de anónimo
  async guardarRespuestas(clienteId: number | null, mesaId: number, respuestas: any, esAnonimo: boolean = false) {
    try {
      console.log('📝 Guardando encuesta:', {
        clienteId,
        mesaId,
        respuestas,
        esAnonimo
      });

      if (!mesaId) {
        throw new Error('ID de mesa no válido');
      }

      if (!esAnonimo && !clienteId) {
        throw new Error('ID de cliente no válido para cliente registrado');
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

      // ✅ CRÍTICO: Para anónimos, cliente_id puede ser NULL
      const dataToInsert = {
        cliente_id: esAnonimo ? null : clienteId,
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

  // ✅ CORREGIDO: Verificar si ya respondió (anónimos solo por mesa)
  async yaRespondiEncuesta(clienteId: number | null, mesaId: number, esAnonimo: boolean = false): Promise<boolean> {
    try {
      console.log('🔍 Verificando encuesta para:', { clienteId, mesaId, esAnonimo });

      if (!mesaId) {
        console.error('❌ Parámetro mesa inválido');
        return false;
      }

      let query = this.supabase
        .from('respuestas_encuesta')
        .select('*')
        .eq('mesa_id', mesaId);

      if (esAnonimo) {
        query = query.is('cliente_id', null);
        console.log('🎭 Verificando anónimo por mesa:', mesaId);
      } else {
        if (!clienteId) {
          console.error('❌ Cliente registrado sin ID');
          return false;
        }
        query = query.eq('cliente_id', clienteId);
        console.log('👤 Verificando registrado:', clienteId, 'mesa:', mesaId);
      }

      const { data, error } = await query;

      console.log('🔎 Resultados búsqueda:', {
        encontrados: data?.length || 0,
        respuestas: data
      });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error verificando encuesta:', error);
        return false;
      }

      const yaRespondio = !!(data && data.length > 0);
      console.log('✅ Ya respondió:', yaRespondio);
      
      return yaRespondio;
    } catch (error) {
      console.error('❌ Error en yaRespondiEncuesta:', error);
      return false;
    }
  }

  async yaRespondioEncuestaHoy(clienteId: number, mesaId: number): Promise<boolean> {
    try {
      console.log('🔍 Verificando encuesta de hoy para:', { clienteId, mesaId });

      if (!clienteId || !mesaId) {
        console.error('❌ Parámetros inválidos:', { clienteId, mesaId });
        return false;
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const inicioHoy = hoy.toISOString();

      const { data, error } = await this.supabase
        .from('respuestas_encuesta')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('mesa_id', mesaId)
        .gte('fecha', inicioHoy);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error verificando encuesta:', error);
        return false;
      }

      const yaRespondio: boolean = !!(data && data.length > 0);
      console.log('✅ Ya respondió hoy:', yaRespondio);
      
      return yaRespondio;
    } catch (error) {
      console.error('❌ Error en yaRespondioEncuestaHoy:', error);
      return false;
    }
  }

  async limpiarRespuestasCliente(clienteId: number | null, mesaId?: number, esAnonimo: boolean = false) {
    try {
      console.log('🧹 Limpiando respuestas para:', { clienteId, mesaId, esAnonimo });

      let query = this.supabase
        .from('respuestas_encuesta')
        .delete();

      if (esAnonimo) {
        if (mesaId) {
          query = query.eq('mesa_id', mesaId).is('cliente_id', null);
        }
      } else {
        if (clienteId) {
          query = query.eq('cliente_id', clienteId);
          if (mesaId) {
            query = query.eq('mesa_id', mesaId);
          }
        }
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

  async obtenerRespuestasCliente(clienteId: number | null, esAnonimo: boolean = false, mesaId?: number) {
    try {
      let query = this.supabase
        .from('respuestas_encuesta')
        .select('*')
        .order('fecha', { ascending: false });

      if (esAnonimo && mesaId) {
        query = query.eq('mesa_id', mesaId).is('cliente_id', null);
      } else if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      } else {
        console.warn('⚠️ Sin parámetros válidos para buscar respuestas');
        return [];
      }

      const { data, error } = await query;

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