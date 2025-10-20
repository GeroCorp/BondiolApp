import { Component, OnInit } from '@angular/core';
import { ClienteAnonimoService } from '../../services/cliente-anonimo.service';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab2-pedido-anonimo',
  templateUrl: './tab2-pedido-anonimo.page.html',
  styleUrls: ['./tab2-pedido-anonimo.page.scss'],
  standalone: false
})
export class Tab2PedidoAnonimoPage implements OnInit {
  pedido: any[] = [];

  constructor(
    private clienteService: ClienteAnonimoService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.clienteService.pedido$.subscribe(pedido => {
      this.pedido = pedido;
    });
  }

  aumentar(index: number) {
    this.clienteService.aumentarCantidad(index);
  }

  disminuir(index: number) {
    this.clienteService.disminuirCantidad(index);
  }

  eliminar(index: number) {
    this.clienteService.eliminarItem(index);
  }

  async limpiar() {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar',
      message: '¿Limpiar el pedido?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Limpiar',
          handler: () => {
            this.clienteService.limpiarPedido();
            this.showToast('Pedido limpiado', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  async confirmar() {
    if (this.pedido.length === 0) {
      this.showToast('El pedido está vacío', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Confirmar Pedido',
      message: `Total: $${this.obtenerTotal()}`,
      buttons: [ { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: async () => await this.procesarPedido()
        }
      ]
    });
    await alert.present();
  }

  private async procesarPedido() {
    try {
      await this.clienteService.enviarPedido();
      
      this.showToast('✅ Pedido enviado a cocina', 'success');
      
      const alert = await this.alertCtrl.create({
        header: '¡Pedido Confirmado!',
        message: 'Tu pedido ha sido enviado. Pronto recibirás tus productos.',
        buttons: ['OK']
      });
      await alert.present();

    } catch (error: any) {
      this.showToast('Error: ' + error.message, 'danger');
    }
  }

  obtenerCantidad(): number {
    return this.clienteService.obtenerCantidadItems();
  }

  obtenerTotal(): number {
    return this.clienteService.obtenerTotal();
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}