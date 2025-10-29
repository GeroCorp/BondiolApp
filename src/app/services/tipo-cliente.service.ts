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

  /**
   * ✅ Normaliza datos de cliente anónimo
   */
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

  /**
   * ✅ Crea o carga cliente anónimo
   */
  async setClienteAnonimo(nombre: string, foto: string | null) {
    try {
      console.log('🎭 setClienteAnonimo:', { nombre, foto });

      // 1️⃣ Buscar cliente anónimo existente EN ESPERA con este nombre
      const { data: existing, error: errEx } = await supabase
        .from('clientes_anonimos')
        .select('*')
        .eq('nombre', nombre.trim())
        .eq('en_espera', true)
        .is('mesa_asignada', null) // ✅ Solo buscar los que NO tienen mesa
        .maybeSingle();

      if (errEx && errEx.code !== 'PGRST116') {
        throw errEx;
      }

      if (existing) {
        console.log('✅ Cliente anónimo existente encontrado:', existing.id_clienteanonimo);
        
        const normalized = this.normalizeAnonimo(existing);
        this.tipoClienteSubject.next('anonimo');
        this.clienteData.next(normalized);
        this.startRealtimeForCliente(normalized);
        
        return normalized;
      }

      // 2️⃣ Crear nuevo cliente anónimo
      console.log('➕ Creando nuevo cliente anónimo');
      
      const { data: newCliente, error } = await supabase
        .from('clientes_anonimos')
        .insert({
          nombre: nombre.trim(),
          foto,
          en_espera: true,
          mesa_asignada: null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Nuevo cliente anónimo creado:', newCliente.id_clienteanonimo);

      const normalized = this.normalizeAnonimo(newCliente);
      this.tipoClienteSubject.next('anonimo');
      this.clienteData.next(normalized);
      this.startRealtimeForCliente(normalized);
      
      return normalized;
    } catch (error) {
      console.error('❌ setClienteAnonimo error:', error);
      throw error;
    }
  }

  /**
   * ✅ Carga cliente anónimo existente desde acceso rápido
   */
  async loadClienteAnonimoExisting(row: any) {
    console.log('📥 loadClienteAnonimoExisting:', row);
    
    const normalized = this.normalizeAnonimo(row);
    this.tipoClienteSubject.next('anonimo');
    this.clienteData.next(normalized);
    this.startRealtimeForCliente(normalized);
    
    return normalized;
  }

  /**
   * ✅ Obtiene los datos del cliente actual
   */
  getClienteData() {
    return this.clienteData.value;
  }

  /**
   * ✅ Obtiene el ID del cliente actual
   */
  getClienteId(): number | null {
    const c = this.clienteData.value;
    if (!c) return null;
    return c.id_cliente ?? null;
  }

  /**
   * ✅ Verifica si el cliente es anónimo
   */
  isAnonimo() {
    return this.tipoClienteSubject.value === 'anonimo';
  }

  /**
   * ✅ Verifica si el cliente es registrado
   */
  isRegistrado() {
    return this.tipoClienteSubject.value === 'registrado';
  }

  /**
   * ✅ Refresca datos del cliente desde la BD
   */
  async refreshClienteData() {
    const current = this.clienteData.value;
    if (!current) {
      console.warn('⚠️ No hay datos para refrescar');
      return null;
    }

    try {
      if (this.isAnonimo()) {
        const idAnon = current.id_clienteanonimo ?? current.id_cliente;
        if (!idAnon) {
          console.error('❌ No hay ID para refrescar anónimo');
          return null;
        }

        console.log('🔄 Refrescando cliente anónimo:', idAnon);
        
        const { data, error } = await supabase
          .from('clientes_anonimos')
          .select('*')
          .eq('id_clienteanonimo', idAnon)
          .single();

        if (error) throw error;

        console.log('✅ Datos anónimo refrescados:', {
          mesa_asignada: data.mesa_asignada,
          en_espera: data.en_espera
        });

        const normalized = this.normalizeAnonimo(data);
        this.clienteData.next(normalized);
        
        return normalized;

      } else {
        const id = current.id_cliente;
        if (!id) {
          console.error('❌ No hay ID para refrescar registrado');
          return null;
        }

        console.log('🔄 Refrescando cliente registrado:', id);
        
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('id_cliente', id)
          .single();

        if (error) throw error;

        console.log('✅ Datos registrado refrescados:', {
          mesa_asignada: data.mesa_asignada
        });

        this.clienteData.next(data);
        
        return data;
      }
    } catch (err) {
      console.error('❌ refreshClienteData error:', err);
      throw err;
    }
  }

  /**
   * ✅ Inicia suscripciones realtime para el cliente
   */
  startRealtimeForCliente(cliente: any) {
    console.log('📡 Iniciando realtime para cliente:', cliente);

    // Limpiar suscripciones anteriores
    this.stopRealtime();

    if (!cliente) {
      console.warn('⚠️ No hay cliente para suscribir');
      return;
    }

    try {
      if (cliente.id_clienteanonimo) {
        // ✅ ANÓNIMO: Suscribirse a clientes_anonimos
        console.log('🎭 Suscribiendo a cambios anónimo:', cliente.id_clienteanonimo);
        
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
              console.log('🔄 Cambio detectado (anónimo):', payload);
              
              try {
                await this.refreshClienteData();
              } catch (error) {
                console.error('Error refrescando tras cambio:', error);
              }
            }
          )
          .subscribe();

      } else if (cliente.id_cliente) {
        // ✅ REGISTRADO: Suscribirse a clientes
        console.log('👤 Suscribiendo a cambios registrado:', cliente.id_cliente);
        
        this.realtimeSubscription = supabase
          .channel(`registrado-${cliente.id_cliente}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'clientes',
              filter: `id_cliente=eq.${cliente.id_cliente}`
            },
            async (payload) => {
              console.log('🔄 Cambio detectado (registrado):', payload);
              
              try {
                await this.refreshClienteData();
              } catch (error) {
                console.error('Error refrescando tras cambio:', error);
              }
            }
          )
          .subscribe();
      }

      // ✅ Suscribirse a cambios en mesas si tiene mesa asignada
      const mesaId = cliente.mesa_asignada;
      if (mesaId) {
        console.log('📍 Suscribiendo a cambios de mesa:', mesaId);
        
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
              console.log('🔄 Cambio detectado en mesa:', payload);
              
              try {
                await this.refreshClienteData();
              } catch (error) {
                console.error('Error refrescando tras cambio mesa:', error);
              }
            }
          )
          .subscribe();
      }

      console.log('✅ Realtime iniciado correctamente');

    } catch (error) {
      console.error('❌ Error iniciando realtime:', error);
    }
  }

  /**
   * ✅ Detiene todas las suscripciones realtime
   */
  stopRealtime() {
    console.log('🛑 Deteniendo suscripciones realtime');
    
    try {
      if (this.realtimeSubscription) {
        this.realtimeSubscription.unsubscribe();
        this.realtimeSubscription = null;
      }
      
      if (this.mesaSubscription) {
        this.mesaSubscription.unsubscribe();
        this.mesaSubscription = null;
      }
    } catch (error) {
      console.error('Error deteniendo realtime:', error);
    }
  }

  /**
   * ✅ Limpia todos los datos del servicio
   */
  clearClienteData() {
    console.log('🧹 Limpiando datos del cliente');
    
    this.stopRealtime();
    this.clienteData.next(null);
    this.tipoClienteSubject.next('registrado');
  }
}