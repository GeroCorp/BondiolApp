import { Component, OnInit, signal } from '@angular/core';
import { Router} from '@angular/router';
import { Delivery } from 'src/app/services/delivery';

@Component({
  selector: 'app-tab2-menu-chats',
  templateUrl: './tab2-menu-chats.page.html',
  styleUrls: ['./tab2-menu-chats.page.scss'],
  standalone: false
})
export class Tab2MenuChatsPage implements OnInit {

  pedidos = signal<any[]>([]);
  
  // Estados que queremos no necesitan un chat activo
  private estadosExcluidos = ['pendiente','confirmado','entregado', 'cuenta_solicitada', 'pago_pendiente', 'pagado'];

  constructor(
    private delivery: Delivery,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadPedidos();
  }


  formatearDireccion(direccion: string){
    if (!direccion){
      console.log("Direccion vacía");
    }
    let formateada = direccion.split(',')
    return formateada[0];
  }

  abrirChat(pedido: any) {
    // Pasarle ID del pedido para cargar el chat correspondiente
    this.router.navigate(['/tabs-delivery/tab2-menu-chats/chat', pedido.id]);
  }

  loadPedidos() {
    this.delivery.getPedidosDelivery().then(
      (pedidos) => {
        // Filtrar pedidos que NO estén en los estados excluidos
        const pedidosFiltrados = pedidos.filter(
          pedido => !this.estadosExcluidos.includes(pedido.estado)
        );
        
        this.pedidos.set(pedidosFiltrados);
        console.log('Pedidos filtrados:', this.pedidos());
      }
    )
  }

}
