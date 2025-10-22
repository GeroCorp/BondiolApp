import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab6EncuestasPage } from './tab6-encuestas.page';

const routes: Routes = [
  {
    path: '',
    component: Tab6EncuestasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab6EncuestasPageRoutingModule {}
