import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab2MesasPage } from './tab2-mesas.page';

const routes: Routes = [
  {
    path: '',
    component: Tab2MesasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab2MesasPageRoutingModule {}
