import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab2RecibirPedidoPage } from './tab2-recibir-pedido.page';

const routes: Routes = [
  {
    path: '',
    component: Tab2RecibirPedidoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab2RecibirPedidoPageRoutingModule {}
