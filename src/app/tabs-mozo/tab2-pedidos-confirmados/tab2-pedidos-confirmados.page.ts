import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';

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
      const pedidos = await this.authService.getPedidosConfirmados();
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
    // TODO: Implementar modal con detalle completo
    const items = await this.authService.getItemsPedido(pedido.id_pedido);
    
    let detalleHTML = `
      <ion-list>
        <ion-list-header>
          <ion-label>Items del pedido</ion-label>
        </ion-list-header>
    `;

    items?.forEach((item: any) => {
      detalleHTML += `
        <ion-item>
          <ion-label>
            <h3>${item.cantidad}x ${item.producto?.nombre}</h3>
            <p>${item.subtotal}</p>
          </ion-label>
        </ion-item>
      `;
    });

    detalleHTML += `</ion-list>`;

    // Mostrar en un alert simple
    const alert = await this.toastController.create({
      message: `Detalle del pedido - Mesa ${pedido.mesa?.numero}`,
      duration: 5000,
      position: 'middle',
      buttons: ['OK']
    });
    await alert.present();
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