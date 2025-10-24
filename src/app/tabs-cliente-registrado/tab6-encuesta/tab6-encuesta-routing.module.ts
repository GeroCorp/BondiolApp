import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab6EncuestaPage } from './tab6-encuesta.page';

const routes: Routes = [
  {
    path: '',
    component: Tab6EncuestaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab6EncuestaPageRoutingModule {}
