import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab7ResultadosPage } from './tab7-resultados.page';

const routes: Routes = [
  {
    path: '',
    component: Tab7ResultadosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab7ResultadosPageRoutingModule {}
