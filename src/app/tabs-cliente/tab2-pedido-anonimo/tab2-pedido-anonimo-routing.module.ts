import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab2PedidoAnonimoPage } from './tab2-pedido-anonimo.page';

const routes: Routes = [
  {
    path: '',
    component: Tab2PedidoAnonimoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab2PedidoAnonimoPageRoutingModule {}
