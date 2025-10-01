import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab3ConsultasPage } from './tab3-consultas.page';

const routes: Routes = [
  {
    path: '',
    component: Tab3ConsultasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab3ConsultasPageRoutingModule {}
