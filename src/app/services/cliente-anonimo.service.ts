import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './supabase';

interface ItemPedido {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  tipo: 'plato' | 'bebida';
  quantity: number;
  subtotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteAnonimoService {
  private pedidoSubject = new BehaviorSubject<ItemPedido[]>([]);
  public pedido$ = this.pedidoSubject.asObservable();

  constructor(private authService: AuthService) {}

  // ========== GESTIÓN DEL PEDIDO ==========

  agregarItem(item: any) {
    const pedidoActual = this.pedidoSubject.value;
    const indexExistente = pedidoActual.findIndex(i => i.id === item.id && i.tipo === item.tipo);
    
    if (indexExistente !== -1) {
      pedidoActual[indexExistente].quantity += item.quantity || 1;
      pedidoActual[indexExistente].subtotal = 
        pedidoActual[indexExistente].precio * pedidoActual[indexExistente].quantity;
    } else {
      const nuevoItem: ItemPedido = {
        id: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion,
        precio: item.precio,
        tipo: item.tipo,
        quantity: item.quantity || 1,
        subtotal: item.precio * (item.quantity || 1)
      };
      pedidoActual.push(nuevoItem);
    }
    
    this.pedidoSubject.next(pedidoActual);
  }

  aumentarCantidad(index: number) {
    const pedidoActual = this.pedidoSubject.value;
    if (pedidoActual[index]) {
      pedidoActual[index].quantity++;
      pedidoActual[index].subtotal = pedidoActual[index].precio * pedidoActual[index].quantity;
      this.pedidoSubject.next(pedidoActual);
    }
  }

  disminuirCantidad(index: number) {
    const pedidoActual = this.pedidoSubject.value;
    if (pedidoActual[index] && pedidoActual[index].quantity > 1) {
      pedidoActual[index].quantity--;
      pedidoActual[index].subtotal = pedidoActual[index].precio * pedidoActual[index].quantity;
      this.pedidoSubject.next(pedidoActual);
    }
  }

  eliminarItem(index: number) {
    const pedidoActual = this.pedidoSubject.value;
    pedidoActual.splice(index, 1);
    this.pedidoSubject.next(pedidoActual);
  }

  limpiarPedido() {
    this.pedidoSubject.next([]);
  }

  obtenerTotal(): number {
    return this.pedidoSubject.value.reduce((total, item) => total + item.subtotal, 0);
  }

  obtenerCantidadItems(): number {
    return this.pedidoSubject.value.reduce((total, item) => total + item.quantity, 0);
  }

  // ========== ENVIAR PEDIDO ==========

  async enviarPedido() {
    try {
      const pedidoActual = this.pedidoSubject.value;
      
      if (pedidoActual.length === 0) {
        throw new Error('El pedido está vacío');
      }

      const mesaData = sessionStorage.getItem('numero_mesa');
      if (!mesaData) {
        throw new Error('No se encontró mesa asignada');
      }

      const numeroMesa = parseInt(mesaData);

      const { data: pedido, error: errorPedido } = await this.authService.client
        .from('pedidos')
        .insert({
          mesa: numeroMesa,
          id_cliente: null,
          fecha: new Date().toISOString(),
          estado: 'pendiente',
          total: this.obtenerTotal()
        })
        .select()
        .single();

      if (errorPedido || !pedido) {
        throw new Error('Error al crear el pedido: ' + errorPedido?.message);
      }

      const detalles = pedidoActual.map(item => ({
        id_pedido: pedido.id,
        nombre_prod: item.nombre,
        cantidad: item.quantity,
        precio_unitario: item.precio,
        tipo: item.tipo
      }));

      const { error: errorDetalles } = await this.authService.client
        .from('detalles_pedido')
        .insert(detalles);

      if (errorDetalles) {
        throw new Error('Error al insertar detalles: ' + errorDetalles.message);
      }

      this.limpiarPedido();
      return pedido;
    } catch (error: any) {
      console.error('Error al enviar pedido:', error);
      throw error;
    }
  }

  // ========== CHAT ==========

  async obtenerMensajesChat() {
  try {
    const mesaData = sessionStorage.getItem('numero_mesa');
    if (!mesaData) return [];

    const numeroMesa = parseInt(mesaData);

    const { data, error } = await this.authService.client
      .from('mensajes')
      .select('*')
      .eq('nroMesa', numeroMesa)
      .order('date_sended', { ascending: true });

    if (error) {
      console.error('Error al obtener mensajes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en obtenerMensajesChat:', error);
    return [];
  }
}

async enviarMensaje(contenido: string) {
  try {
    const clienteData = sessionStorage.getItem('cliente_anonimo');
    const mesaData = sessionStorage.getItem('numero_mesa');

    if (!clienteData || !mesaData) {
      throw new Error('Faltan datos de sesión');
    }

    const cliente = JSON.parse(clienteData);
    const numeroMesa = parseInt(mesaData);

    const { error } = await this.authService.client
      .from('mensajes')
      .insert({
        nroMesa: numeroMesa,
        nombre_usuario: cliente.nombre,
        contenido: contenido,
        date_sended: new Date().toISOString()
      });

    if (error) {
      throw new Error('Error al enviar mensaje: ' + error.message);
    }
    
    console.log('✅ Mensaje enviado correctamente');
  } catch (error: any) {
    console.error('Error al enviar mensaje:', error);
    throw error;
  }
}

/**
 * Suscribirse a nuevos mensajes en tiempo real
 * Similar al método del cliente registrado
 */
suscribirseAMensajes(callback: (mensajes: any[]) => void) {
  try {
    const mesaData = sessionStorage.getItem('numero_mesa');
    if (!mesaData) {
      console.error('No hay número de mesa en sessionStorage');
      return null;
    }

    const numeroMesa = parseInt(mesaData);
    console.log('🔔 Suscribiéndose a mensajes de la mesa:', numeroMesa);

    const subscription = this.authService.client
      .channel(`chat-anonimo-mesa-${numeroMesa}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `nroMesa=eq.${numeroMesa}`
        },
        async (payload) => {
          console.log('📩 Nuevo mensaje recibido:', payload);
          
          // Recargar todos los mensajes para mantener sincronización
          const mensajes = await this.obtenerMensajesChat();
          callback(mensajes);
        }
      )
      .subscribe((status) => {
        console.log('Estado de suscripción:', status);
      });

    return subscription;
  } catch (error) {
    console.error('Error al suscribirse a mensajes:', error);
    return null;
  }
}

  // ========== ✅ CERRAR SESIÓN Y LIBERAR MESA ==========
  
  /**
   * Cierra la sesión del cliente anónimo y libera la mesa asignada
   */
  async cerrarSesionYLiberarMesa(): Promise<void> {
    try {
      // Intentar obtener datos de sessionStorage primero, luego localStorage
      let clienteData = sessionStorage.getItem('cliente_anonimo');
      if (!clienteData) {
        clienteData = localStorage.getItem('cliente_anonimo');
      }
      
      if (!clienteData) {
        console.warn('No hay datos de cliente en storage');
        this.limpiarDatosLocales();
        return;
      }

      const cliente = JSON.parse(clienteData);
      const clienteId = cliente.id || cliente.id_clienteanonimo;

      if (!clienteId) {
        console.error('No se encontró ID del cliente');
        this.limpiarDatosLocales();
        return;
      }

      // Obtener mesa asignada
      const { data, error: errorConsulta } = await this.authService.client
        .from('clientes_anonimos')
        .select('mesa_asignada')
        .eq('id_clienteanonimo', clienteId)
        .single();

      if (errorConsulta) {
        console.error('Error al obtener mesa asignada:', errorConsulta);
        // Limpiar datos locales aunque falle la consulta
        this.limpiarDatosLocales();
        return;
      }

      // Liberar mesa si existe
      if (data?.mesa_asignada) {
        console.log('Liberando mesa:', data.mesa_asignada);

        // Actualizar mesa
        const { error: errorMesa } = await this.authService.client
          .from('mesas')
          .update({
            cliente_asignado: null,
            disponible: true
          })
          .eq('id', data.mesa_asignada);

        if (errorMesa) {
          console.error('Error al liberar mesa:', errorMesa);
        } else {
          console.log('✅ Mesa liberada correctamente');
        }

        // Actualizar cliente anónimo
        const { error: errorCliente } = await this.authService.client
          .from('clientes_anonimos')
          .update({
            mesa_asignada: null,
            en_espera: false
          })
          .eq('id_clienteanonimo', clienteId);

        if (errorCliente) {
          console.error('Error al actualizar cliente:', errorCliente);
        } else {
          console.log('✅ Cliente anónimo actualizado correctamente');
        }
      }

      // Limpiar datos locales
      this.limpiarDatosLocales();

      console.log('✅ Sesión cerrada y mesa liberada correctamente');
    } catch (error: any) {
      console.error('❌ Error en cerrarSesionYLiberarMesa:', error);
      // Intentar limpiar datos locales aunque falle
      this.limpiarDatosLocales();
      throw error;
    }
  }

  /**
   * Limpia todos los datos locales del cliente anónimo
   */
  private limpiarDatosLocales(): void {
    try {
      // Limpiar sessionStorage
      sessionStorage.removeItem('cliente_anonimo');
      sessionStorage.removeItem('numero_mesa');
      sessionStorage.removeItem('polling_interval');
      
      // Limpiar localStorage también
      localStorage.removeItem('cliente_anonimo');
      localStorage.removeItem('mesa_actual');
      
      // Limpiar pedido
      this.limpiarPedido();
      
      console.log('✅ Datos locales limpiados');
    } catch (error) {
      console.error('Error limpiando datos locales:', error);
    }
  }
}