import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PropinaService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.SUPABASE_URL,
      environment.SUPABASE_ANON_KEY
    );
  }

  /**
   * Solicita la cuenta para un pedido
   */
  async solicitarCuenta(pedidoId: number) {
    try {
      const { data, error } = await this.supabase
        .from('pedidos')
        .update({
          estado: 'cuenta_solicitada'
        })
        .eq('id', pedidoId)
        .select();

      if (error) throw error;

      console.log('✅ Cuenta solicitada para pedido:', pedidoId);
      return data;
    } catch (error) {
      console.error('❌ Error solicitando cuenta:', error);
      throw error;
    }
  }

  /**
   * Guarda la propina seleccionada
   */
  async guardarPropina(pedidoId: number, propinaPorcentaje: number, propinaMonto: number) {
    try {
      console.log('💝 Guardando propina:', {
        pedido_id: pedidoId,
        porcentaje: propinaPorcentaje,
        monto: propinaMonto
      });

      // ✅ USAR UPSERT en lugar de INSERT
      // onConflict especifica qué hacer si ya existe una fila con el mismo pedido_id
      const { data, error } = await this.supabase
        .from('propinas')
        .upsert({
          pedido_id: pedidoId,
          porcentaje: propinaPorcentaje,
          monto: propinaMonto,
          fecha: new Date().toISOString()
        }, {
          onConflict: 'pedido_id',  // ✅ Columna única para detectar conflictos
          ignoreDuplicates: false    // ✅ Actualizar si existe, no ignorar
        })
        .select();

      if (error) {
        console.error('❌ Error de Supabase:', error);
        
        // ✅ Mensajes de error más específicos
        if (error.code === '42501') {
          throw new Error('Permisos insuficientes para guardar propina. Contacta al administrador.');
        } else if (error.code === '23503') {
          throw new Error('El pedido especificado no existe.');
        } else if (error.code === '23505') {
          throw new Error('Ya existe una propina para este pedido.');
        } else {
          throw new Error(`Error al guardar propina: ${error.message}`);
        }
      }

      if (!data || data.length === 0) {
        throw new Error('No se pudo guardar la propina (sin datos retornados)');
      }

      console.log('✅ Propina guardada/actualizada:', data);
      return data;
      
    } catch (error: any) {
      console.error('❌ Error en guardarPropina:', error);
      throw error;
    }
  }

  /**
   * Marca el pedido como pagado
   */
  async marcarComoPagado(pedidoId: number) {
    try {
      const { data, error } = await this.supabase
        .from('pedidos')
        .update({
          estado: 'pago_pendiente'
        })
        .eq('id', pedidoId)
        .select();

      if (error) throw error;

      console.log('✅ Pedido marcado como pago pendiente:', pedidoId);
      return data;
    } catch (error) {
      console.error('❌ Error marcando pedido como pagado:', error);
      throw error;
    }
  }

  async obtenerPropina(pedidoId: number) {
    try {
      const { data, error } = await this.supabase
        .from('propinas')
        .select('*')
        .eq('pedido_id', pedidoId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error obteniendo propina:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error en obtenerPropina:', error);
      return null;
    }
  }

  /**
   * ✅ NUEVO: Verificar si un pedido ya tiene propina
   */
  async tienePropina(pedidoId: number): Promise<boolean> {
    try {
      const propina = await this.obtenerPropina(pedidoId);
      return !!propina;
    } catch (error) {
      console.error('❌ Error verificando propina:', error);
      return false;
    }
  }
}