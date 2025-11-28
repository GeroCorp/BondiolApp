import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab6DeliveryPage } from './tab6-delivery.page';

const routes: Routes = [
  {
    path: '',
    component: Tab6DeliveryPage
  },  {
    path: 'pedidos-pendientes',
    loadChildren: () => import('./pedidos-pendientes/pedidos-pendientes.module').then( m => m.PedidosPendientesPageModule)
  },
  {
    path: 'estado-pedidos',
    loadChildren: () => import('./estado-pedidos/estado-pedidos.module').then( m => m.EstadoPedidosPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab6DeliveryPageRoutingModule {}
