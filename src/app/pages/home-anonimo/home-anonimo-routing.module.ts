import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeAnonimoPage } from './home-anonimo.page';

const routes: Routes = [
  {
    path: '',
    component: HomeAnonimoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeAnonimoPageRoutingModule {}
