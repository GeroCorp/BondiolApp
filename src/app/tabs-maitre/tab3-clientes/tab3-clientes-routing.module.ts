import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab3ClientesPage } from './tab3-clientes.page';

const routes: Routes = [
  {
    path: '',
    component: Tab3ClientesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab3ClientesPageRoutingModule {}
