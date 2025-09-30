import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PreSalaPage } from './pre-sala.page';

const routes: Routes = [
  {
    path: '',
    component: PreSalaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PreSalaPageRoutingModule {}
