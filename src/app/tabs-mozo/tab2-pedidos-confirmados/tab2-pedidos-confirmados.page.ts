import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { Mozo } from 'src/app/services/mozo';
import { AuthService } from 'src/app/services/supabase';
import { DetallePedidoModalComponent } from './detalle-pedido-modal/detalle-pedido-modal.component';

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
    private loadingController: LoadingController
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
      await this.authService.actualizarEstadoPedido(pedido.id_pedido, 'entregado');
      
      await this.authService.enviarNotificacionCliente(
        pedido.cliente_id,
        'Pedido entregado',
        `Tu pedido de la mesa ${pedido.mesa?.numero} ha sido entregado. ¡Buen provecho!`
      );

      await loading.dismiss();
      this.showToast('Pedido marcado como entregado', 'success');
      await this.cargarPedidos();
    } catch (error) {
      await loading.dismiss();
      console.error('Error al marcar como entregado:', error);
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
      this.showToast('Error al cargar el detalle del pedido', 'danger');
    }
  }

  async confirmarPago(pedido: any) {
  const loading = await this.loadingController.create({
    message: 'Confirmando pago...',
    spinner: 'crescent',
  });
  await loading.present();

  try {
    // Cambia el estado del pedido a 'pagado'
    await this.authService.client
      .from('pedidos')
      .update({ estado: 'pagado' })
      .eq('id', pedido.id || pedido.id_pedido);

    // Libera la mesa asociada
    await this.authService.client
      .from('mesas')
      .update({ disponible: true, cliente_asignado: null })
      .eq('id', pedido.mesa?.id || pedido.mesa);

    // Notifica a dueño y supervisor
    await this.authService.enviarNotificacionPagoConfirmado(pedido.id || pedido.id_pedido);

    await loading.dismiss();
    this.showToast('Pago confirmado y mesa liberada', 'success');
    await this.cargarPedidos();
  } catch (error) {
    await loading.dismiss();
    console.error('Error al confirmar pago:', error);
    this.showToast('Error al confirmar pago', 'danger');
  }
}

  async showToast(message: string, color: 'success' | 'danger' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}