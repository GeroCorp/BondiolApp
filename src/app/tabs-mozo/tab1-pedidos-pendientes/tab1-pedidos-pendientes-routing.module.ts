import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab1PedidosPendientesPage } from './tab1-pedidos-pendientes.page';

const routes: Routes = [
  {
    path: '',
    component: Tab1PedidosPendientesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab1PedidosPendientesPageRoutingModule {}
