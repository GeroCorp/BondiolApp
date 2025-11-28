import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { Vibration } from '@awesome-cordova-plugins/vibration/ngx';
import { ESTADO, Mozo } from 'src/app/services/mozo';
import { Notification } from 'src/app/services/notification';
import { DetallePedidoModalComponent } from '../tab2-pedidos-confirmados/detalle-pedido-modal/detalle-pedido-modal.component';
import { HapticService } from 'src/app/services/haptic.service';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';
interface Pedido {
  id: number;
  mesa_id: number;
  id_cliente: number;
  estado: string;
  total: number;
  fecha: string;
  mesa?: { numero: number };
  cliente?: { nombre: string; apellido: string };
  items?: ItemPedido[];
  subtotal?: number; // Subtotal SIN descuento
  descuento_porcentaje?: number; // Porcentaje de descuento aplicado
}

interface ItemPedido {
  id_item: number;
  nombre_prod: string;
  cantidad: number;
  precio_unitario: number;
  tipo: 'plato' | 'bebida';
}

@Component({
  selector: 'app-tab1-pedidos-pendientes',
  templateUrl: './tab1-pedidos-pendientes.page.html',
  styleUrls: ['./tab1-pedidos-pendientes.page.scss'],
  standalone: false
})
export class Tab1PedidosPendientesPage implements OnInit {
  pedidosPendientes: Pedido[] = [];
  cargando = true;

  constructor(
    private mozoService: Mozo,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private customLoader: CustomLoaderService,
    private vibration: Vibration,
    private notificationService: Notification,
    private hapticService: HapticService
  ) {}

  async ngOnInit() {
    this.cargarPedidosPendientes();
  }

  async cargarPedidosPendientes() {
    this.cargando = true;
    try {
      const pedidos = await this.mozoService.getPedidosPendientes();
      
      if (pedidos) {
        this.pedidosPendientes = pedidos;
        
        // Procesar cada pedido
        for (const pedido of this.pedidosPendientes) {
          console.log('Pedido ID:', pedido.id);
          
          // Obtener items del pedido
          const items = await this.mozoService.getDetallesPedido(pedido.id);
          pedido.items = items;
          
          pedido.descuento_porcentaje = 0;
          
          console.log({
            pedidoId: pedido.id,
            subtotal: pedido.total,
            total: pedido.total,
            descuento: pedido.descuento_porcentaje
          });
        }
        
        console.log('Pedidos procesados:', this.pedidosPendientes);
      }

    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar los pedidos pendientes', 'danger');
      this.vibration.vibrate(500);
    } finally {
      this.cargando = false;
    }
  }

  async recargar() {
    await this.cargarPedidosPendientes();
    this.showToast('Lista actualizada', 'medium');
  }

  async handleRefresh(event: any) {
    await this.cargarPedidosPendientes();
    event.target.complete();
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    const opciones: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };

    const hora = date.toLocaleTimeString('es-AR', opciones);

    if (date.toDateString() === hoy.toDateString()) {
      return `Hoy ${hora}`;
    } else if (date.toDateString() === ayer.toDateString()) {
      return `Ayer ${hora}`;
    } else {
      return `${date.toLocaleDateString('es-AR')} ${hora}`;
    }
  }

  esPedidoNuevo(fecha: string): boolean {
    const ahora = new Date();
    const fechaPedido = new Date(fecha);
    const diferenciaMinutos = (ahora.getTime() - fechaPedido.getTime()) / 1000 / 60;
    return diferenciaMinutos < 5;
  }

  async rechazarPedido(pedido: Pedido) {
    const alert = await this.alertController.create({
      header: '¿Rechazar pedido?',
      message: `Se rechazará el pedido de la mesa ${pedido.mesa?.numero}. El cliente podrá modificarlo.`,
      inputs: [
        {
          name: 'motivo',
          type: 'textarea',
          placeholder: 'Motivo del rechazo (opcional)',
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Rechazar',
          cssClass: 'alert-button-danger',
          handler: async (data) => {
            await this.procesarRechazo(pedido, data.motivo);
          },
        },
      ],
    });

    await alert.present();
  }

  async procesarRechazo(pedido: Pedido, motivo?: string) {
    await this.customLoader.show('Rechazando pedido...');

    const msg = motivo ? `Tu pedido de la mesa ${pedido.mesa?.numero} fue rechazado. Motivo: ${motivo}` : `Tu pedido de la mesa ${pedido.mesa?.numero} fue rechazado.`;

    try {
      await this.mozoService.actualizarEstadoPedido(pedido.id, ESTADO.RECHAZADO);

      await this.notificationService.sendNotificationToCliente(
        'Pedido rechazado',
        msg,
        '',
        pedido.id_cliente
      );

      await this.customLoader.hide();
      this.showToast('Pedido rechazado. El cliente podrá modificarlo.', 'warning');
      this.vibration.vibrate([100, 50, 100]);

      await this.cargarPedidosPendientes();
    } catch (error) {
      await this.customLoader.hide();
      console.error('Error al rechazar pedido:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al rechazar el pedido', 'danger');
      this.vibration.vibrate(1000);
    }
  }

  async confirmarPedido(pedido: Pedido) {
    // Preparar mensaje con información del descuento si existe
    let mensajeDescuento = '';
    if (pedido.descuento_porcentaje && pedido.descuento_porcentaje > 0) {
      mensajeDescuento = `<br><small>Descuento aplicado: ${pedido.descuento_porcentaje}%</small>`;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar pedido',
      message: `¿Confirmar pedido de la mesa ${pedido.mesa?.numero}?\nTotal: $${pedido.total}${mensajeDescuento}`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Confirmar',
          cssClass: 'alert-button-success',
          handler: async () => {
            await this.procesarConfirmacion(pedido);
          },
        },
      ],
    });

    await alert.present();
  }

  async procesarConfirmacion(pedido: Pedido) {
    await this.customLoader.show('Confirmando pedido...');

    try {
      await this.mozoService.actualizarEstadoPedido(pedido.id, ESTADO.CONFIRMADO);

      const itemsCocina = pedido.items?.filter(item => item.tipo === 'plato') || [];
      const itemsBar = pedido.items?.filter(item => item.tipo === 'bebida') || [];

      if (itemsCocina.length > 0) {
        const nombresCocina = itemsCocina.map(item => `${item.cantidad}x ${item.nombre_prod}`).join(',');
        await this.mozoService.enviarPedidoSector(pedido.id, 'cocina', nombresCocina);
      }

      if (itemsBar.length > 0) {
        const nombresBar = itemsBar.map(item => `${item.cantidad}x ${item.nombre_prod}`).join(',');
        await this.mozoService.enviarPedidoSector(pedido.id, 'bar', nombresBar);
      }

      await this.notificationService.sendNotificationToCliente(
        'Pedido Aprobado',
        `Tu pedido de la mesa ${pedido.mesa?.numero} fue aprobado.`,
        '',
        pedido.id_cliente
      );

      await this.customLoader.hide();
      this.showToast('Pedido confirmado y enviado a cocina/bar', 'success');

      await this.cargarPedidosPendientes();
    } catch (error) {
      await this.customLoader.hide();
      console.error('Error al confirmar pedido:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al confirmar el pedido', 'danger');
      this.vibration.vibrate(1000);
    }
  }

  async verDetalle(pedido: Pedido) {
    try {
      // Cargar los items del pedido
      const items = await this.mozoService.getDetallesPedido(pedido.id);
      
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

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}