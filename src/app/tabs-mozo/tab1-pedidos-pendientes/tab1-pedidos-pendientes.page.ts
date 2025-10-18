import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';
import { Vibration } from '@awesome-cordova-plugins/vibration/ngx';
import { ESTADO, Mozo } from 'src/app/services/mozo';
import { Notification } from 'src/app/services/notification';

interface Pedido {
  id: number;
  mesa_id: number;
  cliente_id: number;
  estado: string;
  total: number;
  fecha: string;
  mesa?: { numero: number };
  cliente?: { nombre: string; apellido: string };
  items?: ItemPedido[];
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
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private vibration: Vibration,
    private notificationService: Notification
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
        this.pedidosPendientes.forEach(async (pedido) => {
          console.log(pedido.id);
          const items = await this.mozoService.getDetallesPedido(pedido.id);
          pedido.items = items;
          pedido.total = items.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0);
        });
        console.log(pedidos);
      }

    } catch (error) {
      console.error('Error al cargar pedidos:', error);
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

  async procesarRechazo(pedido: Pedido, motivo: string) {
    const loading = await this.loadingController.create({
      message: 'Rechazando pedido...',
      spinner: 'crescent',
    });
    await loading.present();

    try {
      await this.mozoService.actualizarEstadoPedido(pedido.id, ESTADO.CONFIRMADO);

      await this.notificationService.sendNotificationToCliente(
        'Pedido rechazado',
        `Tu pedido de la mesa ${pedido.mesa?.numero} fue rechazado. Por favor, modifícalo.`,
        '',
        pedido.cliente_id
      );

      await loading.dismiss();
      this.showToast('Pedido rechazado. El cliente podrá modificarlo.', 'warning');
      this.vibration.vibrate([100, 50, 100]);

      await this.cargarPedidosPendientes();
    } catch (error) {
      await loading.dismiss();
      console.error('Error al rechazar pedido:', error);
      this.showToast('Error al rechazar el pedido', 'danger');
      this.vibration.vibrate(1000);
    }
  }

  async confirmarPedido(pedido: Pedido) {
    const alert = await this.alertController.create({
      header: 'Confirmar pedido',
      message: `¿Confirmar pedido de la mesa ${pedido.mesa?.numero}?<br><strong>Total: $${pedido.total}</strong>`,
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
    const loading = await this.loadingController.create({
      message: 'Confirmando pedido...',
      spinner: 'crescent',
    });
    await loading.present();

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
        pedido.cliente_id
      );
      // await this.authService.enviarNotificacionSector(
      //     'cocinero',
      //     'Nuevo pedido',
      //     `Mesa ${pedido.mesa?.numero}: ${itemsCocina.length} plato(s)`
      //   );
      // await this.authService.enviarNotificacionSector(
      //           'bartender',
      //           'Nuevo pedido',
      //           `Mesa ${pedido.mesa?.numero}: ${itemsBar.length} bebida(s)`
      //         );
      await loading.dismiss();
      this.showToast('Pedido confirmado y enviado a cocina/bar', 'success');

      await this.cargarPedidosPendientes();
    } catch (error) {
      await loading.dismiss();
      console.error('Error al confirmar pedido:', error);
      this.showToast('Error al confirmar el pedido', 'danger');
      this.vibration.vibrate(1000);
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