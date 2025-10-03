import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab2PedidoPage } from './tab2-pedido.page';

const routes: Routes = [
  {
    path: '',
    component: Tab2PedidoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab2PedidoPageRoutingModule {}
