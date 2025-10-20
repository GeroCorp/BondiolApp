import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab4HistorialPage } from './tab4-historial.page';

const routes: Routes = [
  {
    path: '',
    component: Tab4HistorialPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab4HistorialPageRoutingModule {}
