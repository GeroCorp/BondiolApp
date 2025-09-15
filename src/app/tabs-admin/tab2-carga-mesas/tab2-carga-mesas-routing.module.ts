import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab2CargaMesasPage } from './tab2-carga-mesas.page';

const routes: Routes = [
  {
    path: '',
    component: Tab2CargaMesasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab2CargaMesasPageRoutingModule {}
