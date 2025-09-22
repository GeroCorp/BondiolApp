import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab4AdminMesaPage } from './tab4-admin-mesa.page';

const routes: Routes = [
  {
    path: '',
    component: Tab4AdminMesaPage
  } 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab3AdminClientePageRoutingModule {}
