import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab8CuentaPage } from './tab8-cuenta.page';

const routes: Routes = [
  {
    path: '',
    component: Tab8CuentaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab8CuentaPageRoutingModule {}
