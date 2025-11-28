import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tab6-delivery',
  templateUrl: './tab6-delivery.page.html',
  styleUrls: ['./tab6-delivery.page.scss'],
  standalone: false
})
export class Tab6DeliveryPage implements OnInit {

  constructor(
    private router: Router
  ) { }

  ngOnInit() {
  }

  estadoPedidos(){
    this.router.navigate(['/tabs-admin/tab6-delivery/estado-pedidos']);
  }

  pedidosPendientes(){
    this.router.navigate(['/tabs-admin/tab6-delivery/pedidos-pendientes']);
  }

}
