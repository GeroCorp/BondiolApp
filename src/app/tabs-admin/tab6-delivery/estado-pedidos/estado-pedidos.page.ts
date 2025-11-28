import { Component, OnInit, signal } from '@angular/core';
import { Delivery, Pedido } from 'src/app/services/delivery'; 


@Component({
  selector: 'app-estado-pedidos',
  templateUrl: './estado-pedidos.page.html',
  styleUrls: ['./estado-pedidos.page.scss'],
  standalone: false
})
export class EstadoPedidosPage implements OnInit {

  arrayPedidos = signal<Pedido[]>([]);

  constructor(
    private deliveryService: Delivery
  ) { }

  ngOnInit() {
    this.getPedidos();
  }

  getPedidos() {
    this.deliveryService.getPedidosDelivery().then((pedidos: Pedido[]) => {
      this.arrayPedidos.set(pedidos);
    }, (error: any) =>{
      throw new Error('Error al obtener los pedidos de delivery: ' + error);
    });

    console.log(this.arrayPedidos());
  }


}
