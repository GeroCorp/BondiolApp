import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab4PerfilPage } from './tab4-perfil.page';

const routes: Routes = [
  {
    path: '',
    component: Tab4PerfilPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab4PerfilPageRoutingModule {}
