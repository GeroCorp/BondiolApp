import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';
import { Vibration } from '@awesome-cordova-plugins/vibration/ngx';

interface Pedido {
  id_pedido: number;
  mesa_id: number;
  cliente_id: number;
  estado: string;
  total: number;
  tiempo_estimado: number;
  observaciones?: string;
  created_at: string;
  mesa?: { numero: number };
  cliente?: { nombre: string; apellido: string };
  items?: ItemPedido[];
}

interface ItemPedido {
  id_item: number;
  producto_id: number;
  cantidad: number;
  subtotal: number;
  producto?: {
    nombre: string;
    descripcion: string;
    tipo: 'comida' | 'bebida';
    precio: number;
  };
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
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private vibration: Vibration
  ) {}

  async ngOnInit() {
    await this.cargarPedidosPendientes();
  }

  async cargarPedidosPendientes() {
    this.cargando = true;
    try {
      const pedidos = await this.authService.getPedidosPendientesConfirmacion();
      
      if (pedidos) {
        for (const pedido of pedidos) {
          const items = await this.authService.getItemsPedido(pedido.id_pedido);
          pedido.items = items || [];
        }
        this.pedidosPendientes = pedidos;
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
      await this.authService.actualizarEstadoPedido(pedido.id_pedido, 'rechazado', motivo);

      await this.authService.enviarNotificacionCliente(
        pedido.cliente_id,
        'Pedido rechazado',
        `Tu pedido de la mesa ${pedido.mesa?.numero} fue rechazado. Por favor, modifícalo.`
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
      await this.authService.actualizarEstadoPedido(pedido.id_pedido, 'confirmado');

      const itemsCocina = pedido.items?.filter(item => item.producto?.tipo === 'comida') || [];
      const itemsBar = pedido.items?.filter(item => item.producto?.tipo === 'bebida') || [];

      if (itemsCocina.length > 0) {
        await this.authService.enviarPedidoSector(pedido.id_pedido, 'cocina', itemsCocina);
        await this.authService.enviarNotificacionSector(
          'cocinero',
          'Nuevo pedido',
          `Mesa ${pedido.mesa?.numero}: ${itemsCocina.length} plato(s)`
        );
      }

      if (itemsBar.length > 0) {
        await this.authService.enviarPedidoSector(pedido.id_pedido, 'bar', itemsBar);
        await this.authService.enviarNotificacionSector(
          'bartender',
          'Nuevo pedido',
          `Mesa ${pedido.mesa?.numero}: ${itemsBar.length} bebida(s)`
        );
      }

      await this.authService.enviarNotificacionCliente(
        pedido.cliente_id,
        'Pedido confirmado',
        `Tu pedido de la mesa ${pedido.mesa?.numero} está siendo preparado.`
      );

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