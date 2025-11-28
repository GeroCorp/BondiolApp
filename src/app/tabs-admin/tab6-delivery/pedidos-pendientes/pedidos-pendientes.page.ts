import { Component, OnInit, signal } from '@angular/core';
import { Delivery, Pedido, Cliente } from 'src/app/services/delivery';
import { ModalController, AlertController } from '@ionic/angular';
import { DetallePedidoDeliveryModalComponent } from '../detalle-pedido-delivery-modal/detalle-pedido-delivery-modal.component';

@Component({
  selector: 'app-pedidos-pendientes',
  templateUrl: './pedidos-pendientes.page.html',
  styleUrls: ['./pedidos-pendientes.page.scss'],
  standalone: false
})
export class PedidosPendientesPage implements OnInit {

  arrayPedidos = signal<Pedido[]>([]);

  constructor(
    private deliveryService: Delivery,
    private modalController: ModalController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.getPedidos()
  }

  getPedidos() {
    this.deliveryService.getPedidosPendientes().then((pedidos: Pedido[]) => {
      this.arrayPedidos.set(pedidos);
      console.log(this.arrayPedidos());
      
    }, (error: any) =>{
      throw new Error('Error al obtener los pedidos de delivery: ' + error);
    });

  }

  async showDetalles(pedido: Pedido) {
    const modal = await this.modalController.create({
      component: DetallePedidoDeliveryModalComponent,
      componentProps: {
        pedido: pedido
      },
      cssClass: 'modal-entero',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1
    });
    
    await modal.present();
  }

  getTextoEstado(estado: string): string {
    const textos: any = {
      pendiente: 'Confirmar',
      confirmado: 'Confirmado',
      en_preparacion: 'En preparación',
      listo: 'Listo',
      entregado: 'Entregado'
    };
    return textos[estado] || estado;
  }

  confirmarPedido(pedido: Pedido) {
    this.deliveryService.confirmarPedido(pedido.id, pedido.cliente.id_cliente).then(() => {
      pedido.estado = 'confirmado';
      this.arrayPedidos.set([...this.arrayPedidos()]);
    });
  }

  async rechazarPedido(pedido: Pedido) {

    const alert = await this.alertController.create({
      header: '¿Rechazar pedido?',
      cssClass: 'custom-html-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            this.deliveryService.rechazarPedido(pedido.id, pedido.cliente.id_cliente).then(() => {
              pedido.estado = 'rechazado';
              this.arrayPedidos.set([...this.arrayPedidos()]);
            });
          }
        }
      ]
    });
    alert.present()


    
  }

}
