import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ListaEsperaClientePage } from './lista-espera-cliente.page';

const routes: Routes = [
  {
    path: '',
    component: ListaEsperaClientePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ListaEsperaClientePageRoutingModule {}
