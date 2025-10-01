import { Component, OnInit } from '@angular/core';
import { ClienteService } from '../../services/cliente.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tab2-pedido',
  templateUrl: './tab2-pedido.page.html',
  styleUrls: ['./tab2-pedido.page.scss'],
  standalone: false
})
export class Tab2PedidoPage implements OnInit {

  constructor(public clienteService: ClienteService, private router: Router) { }

  ngOnInit() {
  }

  // Getter para acceder al pedido desde el template
  get pedido() {
    return this.clienteService.pedido;
  }

  // Remover un item del pedido
  removeItem(index: number) {
    this.clienteService.removeItem(index);
  }

  // Limpiar todo el pedido
  clearPedido() {
    this.clienteService.clearPedido();
  }

  // Aumentar cantidad de un item
  increaseQuantity(index: number) {
    const currentItem = this.clienteService.pedido()[index];
    this.clienteService.updateItemQuantity(index, currentItem.quantity + 1);
  }

  // Disminuir cantidad de un item
  decreaseQuantity(index: number) {
    const currentItem = this.clienteService.pedido()[index];
    this.clienteService.updateItemQuantity(index, currentItem.quantity - 1);
  }

  volverHome(){
    this.router.navigate(["/home-cliente"])
  }

}
