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
      const { data, error } = await this.supabase
        .from('propinas')
        .insert({
          pedido_id: pedidoId,
          porcentaje: propinaPorcentaje,
          monto: propinaMonto,
          fecha: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      console.log('✅ Propina guardada:', data);
      return data;
    } catch (error) {
      console.error('❌ Error guardando propina:', error);
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
}