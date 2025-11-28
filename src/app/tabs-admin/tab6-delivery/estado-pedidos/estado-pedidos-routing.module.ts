import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EstadoPedidosPage } from './estado-pedidos.page';

const routes: Routes = [
  {
    path: '',
    component: EstadoPedidosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EstadoPedidosPageRoutingModule {}
