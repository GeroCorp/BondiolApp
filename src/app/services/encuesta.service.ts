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
   * Verifica si el cliente ya respondió la encuesta en esta estadía
   */
  async yaRespondiEncuesta(clienteId: number, mesaId: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('respuestas_encuesta')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('mesa_id', mesaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error verificando encuesta:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error en yaRespondiEncuesta:', error);
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
        console.error('❌ Error guardando respuestas:', error);
        throw error;
      }

      console.log('✅ Encuesta guardada correctamente:', data);
      return data;
    } catch (error) {
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
}