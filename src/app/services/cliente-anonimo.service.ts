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

  /**
   * 📥 Obtener mensajes del chat SOLO de la mesa actual
   */
  async obtenerMensajesChat() {
    try {
      const mesaData = sessionStorage.getItem('numero_mesa');
      if (!mesaData) {
        console.error('❌ No hay número de mesa en sessionStorage');
        return [];
      }

      const numeroMesa = parseInt(mesaData);

      console.log('📋 Obteniendo mensajes de la mesa:', numeroMesa);

      // ✅ Filtrar por mesa Y ordenar por fecha
      const { data, error } = await this.authService.client
        .from('mensajes')
        .select('*')
        .eq('nroMesa', numeroMesa)
        .order('date_sended', { ascending: true });

      if (error) {
        console.error('❌ Error al obtener mensajes:', error);
        return [];
      }

      console.log('✅ Mensajes obtenidos:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Error en obtenerMensajesChat:', error);
      return [];
    }
  }

  /**
   * 📨 Enviar mensaje al chat
   */
  async enviarMensaje(contenido: string) {
    try {
      const clienteData = sessionStorage.getItem('cliente_anonimo');
      const mesaData = sessionStorage.getItem('numero_mesa');

      if (!clienteData || !mesaData) {
        throw new Error('Faltan datos de sesión');
      }

      const cliente = JSON.parse(clienteData);
      const numeroMesa = parseInt(mesaData);

      console.log('📤 Enviando mensaje:', {
        mesa: numeroMesa,
        usuario: cliente.nombre,
        contenido: contenido.substring(0, 50) + '...'
      });

      const { data, error } = await this.authService.client
        .from('mensajes')
        .insert({
          nroMesa: numeroMesa,
          nombre_usuario: cliente.nombre,
          contenido: contenido,
          date_sended: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error al enviar mensaje:', error);
        throw new Error('Error al enviar mensaje: ' + error.message);
      }
      
      console.log('✅ Mensaje enviado correctamente:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error al enviar mensaje:', error);
      throw error;
    }
  }

  /**
   * 🔔 Suscribirse a nuevos mensajes en tiempo real
   * SOLO de la mesa actual del cliente anónimo
   */
  suscribirseAMensajes(callback: (mensajes: any[]) => void) {
    try {
      const mesaData = sessionStorage.getItem('numero_mesa');
      if (!mesaData) {
        console.error('❌ No hay número de mesa en sessionStorage');
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
            filter: `nroMesa=eq.${numeroMesa}` // ✅ FILTRO CRUCIAL
          },
          async (payload) => {
            console.log('📩 Nuevo mensaje recibido:', payload);
            
            // Recargar todos los mensajes de ESTA mesa
            const mensajes = await this.obtenerMensajesChat();
            callback(mensajes);
          }
        )
        .subscribe((status) => {
          console.log('📡 Estado de suscripción:', status);
        });

      return subscription;
    } catch (error) {
      console.error('❌ Error al suscribirse a mensajes:', error);
      return null;
    }
  }

  /**
   * 🧹 Limpia mensajes de la mesa cuando se libera
   */
  private async limpiarMensajesMesa(numeroMesa: number): Promise<void> {
    try {
      console.log('🧹 Limpiando mensajes de la mesa:', numeroMesa);

      const { error } = await this.authService.client
        .from('mensajes')
        .delete()
        .eq('nroMesa', numeroMesa);

      if (error) {
        console.error('❌ Error limpiando mensajes:', error);
      } else {
        console.log('✅ Mensajes de la mesa limpiados correctamente');
      }
    } catch (error) {
      console.error('❌ Error en limpiarMensajesMesa:', error);
    }
  }

  /**
   * 🚪 Cierra la sesión del cliente anónimo y libera la mesa asignada
   * ✅ CORREGIDO: Ahora limpia correctamente la mesa Y los mensajes
   */
  async cerrarSesionYLiberarMesa(): Promise<void> {
    try {
      console.log('🔄 Iniciando cierre de sesión y liberación de mesa...');

      // Obtener datos del cliente
      let clienteData = sessionStorage.getItem('cliente_anonimo');
      if (!clienteData) {
        clienteData = localStorage.getItem('cliente_anonimo');
      }
      
      if (!clienteData) {
        console.warn('⚠️ No hay datos de cliente en storage');
        this.limpiarDatosLocales();
        return;
      }

      const cliente = JSON.parse(clienteData);
      const clienteId = cliente.id || cliente.id_clienteanonimo;

      if (!clienteId) {
        console.error('❌ No se encontró ID del cliente');
        this.limpiarDatosLocales();
        return;
      }

      console.log('📋 Cliente ID:', clienteId);

      // 1️⃣ Obtener información completa del cliente anónimo
      const { data: clienteInfo, error: errorClienteInfo } = await this.authService.client
        .from('clientes_anonimos')
        .select('mesa_asignada')
        .eq('id_clienteanonimo', clienteId)
        .single();

      if (errorClienteInfo || !clienteInfo) {
        console.error('❌ Error obteniendo info del cliente:', errorClienteInfo);
        this.limpiarDatosLocales();
        return;
      }

      console.log('📊 Info del cliente:', clienteInfo);

      // 2️⃣ Si tiene mesa asignada, liberarla completamente
      if (clienteInfo.mesa_asignada) {
        const mesaId = clienteInfo.mesa_asignada;
        console.log('🔓 Liberando mesa ID:', mesaId);

        // Obtener el número de la mesa para limpiar mensajes
        const { data: mesaData, error: errorMesa } = await this.authService.client
          .from('mesas')
          .select('numero')
          .eq('id', mesaId)
          .single();

        if (errorMesa) {
          console.error('❌ Error obteniendo datos de mesa:', errorMesa);
        } else if (mesaData) {
          const numeroMesa = mesaData.numero;
          console.log('📍 Número de mesa:', numeroMesa);

          // 🧹 Limpiar mensajes del chat ANTES de liberar la mesa
          await this.limpiarMensajesMesa(numeroMesa);
        }

        // 3️⃣ Liberar la mesa en la tabla mesas
        console.log('🔄 Actualizando tabla mesas...');
        const { error: errorLiberarMesa } = await this.authService.client
          .from('mesas')
          .update({
            cliente_asignado: null,
            disponible: true
          })
          .eq('id', mesaId);

        if (errorLiberarMesa) {
          console.error('❌ Error liberando mesa:', errorLiberarMesa);
        } else {
          console.log('✅ Mesa liberada en tabla mesas');
        }
      }

      // 4️⃣ Actualizar cliente anónimo (quitar mesa asignada)
      console.log('🔄 Actualizando cliente anónimo...');
      const { error: errorActualizarCliente } = await this.authService.client
        .from('clientes_anonimos')
        .update({
          mesa_asignada: null,
          en_espera: false
        })
        .eq('id_clienteanonimo', clienteId);

      if (errorActualizarCliente) {
        console.error('❌ Error actualizando cliente:', errorActualizarCliente);
      } else {
        console.log('✅ Cliente anónimo actualizado');
      }

      // 5️⃣ Eliminar de lista de espera si existe
      console.log('🔄 Limpiando lista de espera...');
      const nombreCompleto = `${cliente.nombre}`;
      const { error: errorListaEspera } = await this.authService.client
        .from('lista_espera')
        .delete()
        .eq('nombre_cliente', nombreCompleto);

      if (errorListaEspera) {
        console.log('⚠️ Error limpiando lista de espera:', errorListaEspera);
      } else {
        console.log('✅ Cliente eliminado de lista de espera');
      }

      // 6️⃣ Limpiar datos locales
      this.limpiarDatosLocales();

      console.log('✅ ¡Sesión cerrada completamente! Mesa liberada, mensajes eliminados');

    } catch (error: any) {
      console.error('❌ Error crítico en cerrarSesionYLiberarMesa:', error);
      // Limpiar datos locales de todas formas
      this.limpiarDatosLocales();
      throw error;
    }
  }

  /**
   * 🧹 Limpia todos los datos locales del cliente anónimo
   */
  private limpiarDatosLocales(): void {
    try {
      console.log('🧹 Limpiando datos locales...');
      
      // Limpiar sessionStorage
      sessionStorage.removeItem('cliente_anonimo');
      sessionStorage.removeItem('numero_mesa');
      sessionStorage.removeItem('mesa_verificada');
      sessionStorage.removeItem('polling_interval');
      
      // Limpiar localStorage también
      localStorage.removeItem('cliente_anonimo');
      localStorage.removeItem('mesa_actual');
      
      // Limpiar pedido
      this.limpiarPedido();
      
      console.log('✅ Datos locales limpiados completamente');
    } catch (error) {
      console.error('❌ Error limpiando datos locales:', error);
    }
  }
}