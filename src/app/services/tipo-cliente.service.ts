import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from './supabase';

@Injectable({
  providedIn: 'root'
})
export class TipoClienteService {
  private clienteData = new BehaviorSubject<any>(null);
  clienteData$ = this.clienteData.asObservable();

  private tipoClienteSubject = new BehaviorSubject<'anonimo' | 'registrado'>('registrado');
  tipoCliente$ = this.tipoClienteSubject.asObservable();

  private realtimeSubscription: any = null;
  private mesaSubscription: any = null;

  constructor() {}

  // Normaliza cliente anónimo para que siempre tenga id_cliente y apellido ''
  private normalizeAnonimo(row: any) {
    if (!row) return null;
    return {
      ...row,
      id_cliente: row.id_cliente ?? row.id_clienteanonimo,
      id_clienteanonimo: row.id_clienteanonimo ?? row.id_cliente,
      apellido: row.apellido ?? '',
      en_espera: typeof row.en_espera === 'boolean' ? row.en_espera : true,
      mesa_asignada: row.mesa_asignada ?? null
    };
  }

  async setClienteAnonimo(nombre: string, foto: string | null) {
    try {
      // Evitar duplicados buscando por nombre y en_espera true
      const { data: existing, error: errEx } = await supabase
        .from('clientes_anonimos')
        .select('*')
        .eq('nombre', nombre)
        .eq('en_espera', true)
        .maybeSingle();

      if (errEx) throw errEx;

      if (existing) {
        const normalized = this.normalizeAnonimo(existing);
        this.tipoClienteSubject.next('anonimo');
        this.clienteData.next(normalized);
        // iniciar realtime para este cliente
        this.startRealtimeForCliente(normalized);
        return normalized;
      }

      const { data: newCliente, error } = await supabase
        .from('clientes_anonimos')
        .insert({
          nombre,
          foto,
          en_espera: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      const normalized = this.normalizeAnonimo(newCliente);
      this.tipoClienteSubject.next('anonimo');
      this.clienteData.next(normalized);
      this.startRealtimeForCliente(normalized);
      return normalized;
    } catch (error) {
      console.error('setClienteAnonimo error', error);
      throw error;
    }
  }

  // Cargar cliente anónimo existente (acceso rápido)
  async loadClienteAnonimoExisting(row: any) {
    const normalized = this.normalizeAnonimo(row);
    this.tipoClienteSubject.next('anonimo');
    this.clienteData.next(normalized);
    this.startRealtimeForCliente(normalized);
    return normalized;
  }

  getClienteData() {
    return this.clienteData.value;
  }

  getClienteId(): number | null {
    const c = this.clienteData.value;
    if (!c) return null;
    return c.id_cliente ?? null;
  }

  isAnonimo() {
    return this.tipoClienteSubject.value === 'anonimo';
  }

  isRegistrado() {
    return this.tipoClienteSubject.value === 'registrado';
  }

  // Refresca datos del cliente desde la BD y normaliza
  async refreshClienteData() {
    const current = this.clienteData.value;
    if (!current) return null;

    try {
      if (this.isAnonimo()) {
        const idAnon = current.id_clienteanonimo ?? current.id_cliente;
        if (!idAnon) return null;
        const { data, error } = await supabase
          .from('clientes_anonimos')
          .select('*')
          .eq('id_clienteanonimo', idAnon)
          .single();
        if (error) throw error;
        const normalized = this.normalizeAnonimo(data);
        this.clienteData.next(normalized);
        return normalized;
      } else {
        const id = current.id_cliente;
        if (!id) return null;
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('id_cliente', id)
          .single();
        if (error) throw error;
        this.clienteData.next(data);
        return data;
      }
    } catch (err) {
      console.error('refreshClienteData error', err);
      throw err;
    }
  }

  // Inicia suscripciones realtime para este cliente anónimo:
  startRealtimeForCliente(cliente: any) {
    // limpiar suscripciones previas
    try {
      if (this.realtimeSubscription) {
        this.realtimeSubscription.unsubscribe?.();
        this.realtimeSubscription = null;
      }
      if (this.mesaSubscription) {
        this.mesaSubscription.unsubscribe?.();
        this.mesaSubscription = null;
      }
    } catch (e) {}

    if (!cliente) return;

    // Suscribirse a cambios en la fila de clientes_anonimos para este id
    if (cliente.id_clienteanonimo) {
      this.realtimeSubscription = supabase
        .channel(`anonimo-${cliente.id_clienteanonimo}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clientes_anonimos',
            filter: `id_clienteanonimo=eq.${cliente.id_clienteanonimo}`
          },
          async (payload) => {
            console.log('realtime clientes_anonimos payload', payload);
            // refrescar datos y propagar
            await this.refreshClienteData().catch(() => {});
          }
        )
        .subscribe();
    }

    // Suscribirse a cambios en la mesa asignada (por si el maitre actualiza mesa o mesas.cliente_asignado)
    const mesaId = cliente.mesa_asignada;
    if (mesaId) {
      this.mesaSubscription = supabase
        .channel(`mesa-${mesaId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mesas',
            filter: `id=eq.${mesaId}`
          },
          async (payload) => {
            console.log('realtime mesas payload', payload);
            await this.refreshClienteData().catch(() => {});
          }
        )
        .subscribe();
    } else {
      // También subscribe a mesas donde cliente_asignado fue puesto con este cliente id (en caso el maitre asigna vinculo por mesas.cliente_asignado)
      const clientId = cliente.id_cliente ?? cliente.id_clienteanonimo;
      if (clientId) {
        this.mesaSubscription = supabase
          .channel(`mesas-cliente-${clientId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'mesas',
              // filtrar cambios donde cliente_asignado igual al id (covers registered flow)
              // para anonimos el maestro debe actualizar clientes_anonimos.mesa_asignada, pero dejamos esto como respaldo
              filter: `cliente_asignado=eq.${clientId}`
            },
            async () => {
              await this.refreshClienteData().catch(() => {});
            }
          )
          .subscribe();
      }
    }
  }

  stopRealtime() {
    try {
      this.realtimeSubscription?.unsubscribe?.();
      this.mesaSubscription?.unsubscribe?.();
    } catch (e) {}
    this.realtimeSubscription = null;
    this.mesaSubscription = null;
  }
}