import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab5CuentaAnonimoPage } from './tab5-cuenta-anonimo.page';

const routes: Routes = [
  {
    path: '',
    component: Tab5CuentaAnonimoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab5CuentaAnonimoPageRoutingModule {}
