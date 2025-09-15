import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab3AdminClientePage } from './tab3-admin-cliente.page';

const routes: Routes = [
  {
    path: '',
    component: Tab3AdminClientePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab3AdminClientePageRoutingModule {}
