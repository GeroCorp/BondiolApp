import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab3ConsultaAnonimoPage } from './tab3-consulta-anonimo.page';

const routes: Routes = [
  {
    path: '',
    component: Tab3ConsultaAnonimoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab3ConsultaAnonimoPageRoutingModule {}
