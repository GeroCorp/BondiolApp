import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab4ResultadosAnonimoPage } from './tab4-resultados-anonimo.page';

const routes: Routes = [
  {
    path: '',
    component: Tab4ResultadosAnonimoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab4ResultadosAnonimoPageRoutingModule {}
