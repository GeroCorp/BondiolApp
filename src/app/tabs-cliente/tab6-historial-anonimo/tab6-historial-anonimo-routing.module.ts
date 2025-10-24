import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab6HistorialAnonimoPage } from './tab6-historial-anonimo.page';

const routes: Routes = [
  {
    path: '',
    component: Tab6HistorialAnonimoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab6HistorialAnonimoPageRoutingModule {}
