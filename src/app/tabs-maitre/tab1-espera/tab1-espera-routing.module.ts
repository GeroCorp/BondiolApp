import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab1Espera } from './tab1-espera.page';

const routes: Routes = [
  {
    path: '',
    component: Tab1Espera
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab1EsperaPageRoutingModule {}
