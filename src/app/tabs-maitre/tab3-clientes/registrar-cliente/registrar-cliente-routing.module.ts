import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RegistrarClientePage } from './registrar-cliente.page';

const routes: Routes = [
  {
    path: '',
    component: RegistrarClientePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RegistrarClientePageRoutingModule {}
