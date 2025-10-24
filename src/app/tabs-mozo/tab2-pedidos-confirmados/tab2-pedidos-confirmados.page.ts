import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { Mozo } from 'src/app/services/mozo';
import { AuthService } from 'src/app/services/supabase';
import { DetallePedidoModalComponent } from './detalle-pedido-modal/detalle-pedido-modal.component';
import { Notification } from 'src/app/services/notification';

import { HapticService } from 'src/app/services/haptic.service';
@Component({
  selector: 'app-tab2-pedidos-confirmados',
  templateUrl: './tab2-pedidos-confirmados.page.html',
  styleUrls: ['./tab2-pedidos-confirmados.page.scss'],
  standalone: false,
})
export class Tab2PedidosConfirmadosPage implements OnInit {
  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];
  filtroEstado = 'todos';
  cargando = true;

  constructor(
    private mozoService: Mozo,
    private authService: AuthService,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private notificationService: Notification,
    private hapticService: HapticService
  ) {}

  async ngOnInit() {
    await this.cargarPedidos();
  }

  async cargarPedidos() {
    this.cargando = true;
    try {
      const pedidos = await this.mozoService.getPedidosConfirmados();
      this.pedidos = pedidos || [];
      this.filtrarPedidos();
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar pedidos confirmados', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  filtrarPedidos() {
    if (this.filtroEstado === 'todos') {
      this.pedidosFiltrados = this.pedidos;
    } else {
      this.pedidosFiltrados = this.pedidos.filter(
        pedido => pedido.estado === this.filtroEstado
      );
    }
  }

  async recargar() {
    await this.cargarPedidos();
    this.showToast('Lista actualizada', 'medium');
  }

  async handleRefresh(event: any) {
    await this.cargarPedidos();
    event.target.complete();
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const hoy = new Date();
    
    const opciones: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const hora = date.toLocaleTimeString('es-AR', opciones);

    if (date.toDateString() === hoy.toDateString()) {
      return `Hoy ${hora}`;
    } else {
      return `${date.toLocaleDateString('es-AR')} ${hora}`;
    }
  }

  getColorEstado(estado: string): string {
    const colores: any = {
      confirmado: 'warning',
      en_preparacion: 'tertiary',
      listo: 'success',
      entregado: 'medium'
    };
    return colores[estado] || 'medium';
  }

  getTextoEstado(estado: string): string {
    const textos: any = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      en_preparacion: 'En preparación',
      listo: 'Listo',
      entregado: 'Entregado'
    };
    return textos[estado] || estado;
  }

  getColorSector(estado: string): string {
    const colores: any = {
      pendiente: 'warning',
      en_preparacion: 'tertiary',
      listo: 'success'
    };
    return colores[estado] || 'medium';
  }

  async marcarEntregado(pedido: any) {
    const loading = await this.loadingController.create({
      message: 'Marcando como entregado...',
      spinner: 'crescent',
    });
    await loading.present();

    try {
      await this.authService.actualizarEstadoPedido(pedido.id, 'entregado');

      await this.notificationService.sendNotificationToCliente(
        `Pedido entregado`,
        `Su pedido fue marcado como entregado por el mozo, por favor confirme el estado.`,
        '',
        pedido.id_cliente
      );

      await loading.dismiss();
      this.showToast('Pedido marcado como entregado', 'success');
      await this.cargarPedidos();
    } catch (error) {
      await loading.dismiss();
      console.error('Error al marcar como entregado:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al actualizar el pedido', 'danger');
    }
  }

  async verDetalle(pedido: any) {
    try {
      // Cargar los items del pedido
      const items = await this.mozoService.getDetallesPedido(pedido.id || pedido.id_pedido);
      
      // Crear y presentar el modal
      const modal = await this.modalController.create({
        component: DetallePedidoModalComponent,
        componentProps: {
          pedido: pedido,
          items: items || []
        },
        cssClass: 'detalle-pedido-modal'
      });
      
      await modal.present();
    } catch (error) {
      console.error('Error al cargar detalle del pedido:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar el detalle del pedido', 'danger');
    }
  }

  async confirmarPago(pedido: any) {
    // Verificar que el pedido esté en estado pago_pendiente
    if (pedido.estado !== 'pago_pendiente') {
      this.showToast('El cliente aún no ha realizado el pago', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Confirmando pago y liberando mesa...',
      spinner: 'crescent',
    });
    await loading.present();

    try {
      const pedidoId = pedido.id || pedido.id_pedido;
      const mesaId = pedido.mesa?.id || pedido.mesa;

      // Cambiar estado del pedido a 'pagado'
      await this.authService.client
        .from('pedidos')
        .update({ estado: 'pagado' })
        .eq('id', pedidoId);

      // Liberar la mesa
      await this.authService.client
        .from('mesas')
        .update({ 
          disponible: true, 
          cliente_asignado: null 
        })
        .eq('id', mesaId);

      // Limpiar mesa_asignada del cliente
      if (pedido.id_cliente) {
        await this.authService.client
          .from('clientes')
          .update({ mesa_asignada: null })
          .eq('id_cliente', pedido.id_cliente);
      }

      // Notificar a dueño y supervisor
      await this.notificationService.sendNotificationToPerfil(
        'dueño',
        '💰 Pago confirmado',
        `Mesa ${pedido.mesa?.numero} - Pedido #${pedidoId} pagado y liberado. Total: $${pedido.total}`
      );

      await this.notificationService.sendNotificationToPerfil(
        'supervisor',
        '💰 Pago confirmado',
        `Mesa ${pedido.mesa?.numero} - Pedido #${pedidoId} pagado y liberado. Total: $${pedido.total}`
      );

      // Notificar al cliente
      if (pedido.id_cliente) {
        await this.notificationService.sendNotificationToCliente(
          '✅ Pago confirmado',
          'Tu pago fue confirmado. ¡Gracias por visitarnos! Esperamos verte pronto.',
          '',
          pedido.id_cliente
        );
      }

    await loading.dismiss();
    this.showToast('Pago confirmado y mesa liberada', 'success');
    await this.cargarPedidos();
  } catch (error) {
    await loading.dismiss();
    console.error('Error al confirmar pago:', error);
    await this.hapticService.vibrateError();
    this.showToast('Error al confirmar pago', 'danger');
  }
}

  async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}