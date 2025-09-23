import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab2Mesas } from './tab2-mesas.page';

const routes: Routes = [
  {
    path: '',
    component: Tab2Mesas
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab2MesasPageRoutingModule {}
