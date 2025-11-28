import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab1PedidosPage } from './tab1-pedidos.page';

const routes: Routes = [
  {
    path: '',
    component: Tab1PedidosPage
  },
  {
    path: 'maps/:id_pedido',
    loadChildren: () => import('./maps/maps.module').then( m => m.MapsPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab1PedidosPageRoutingModule {}
