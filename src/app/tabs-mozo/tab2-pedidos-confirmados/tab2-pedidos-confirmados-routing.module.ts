import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab2PedidosConfirmadosPage } from './tab2-pedidos-confirmados.page';

const routes: Routes = [
  {
    path: '',
    component: Tab2PedidosConfirmadosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab2PedidosConfirmadosPageRoutingModule {}
