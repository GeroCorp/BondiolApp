import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab5AdminPerfilPage } from './tab5-admin-perfil.page';

const routes: Routes = [
  {
    path: '',
    component: Tab5AdminPerfilPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab5AdminPerfilPageRoutingModule {}
