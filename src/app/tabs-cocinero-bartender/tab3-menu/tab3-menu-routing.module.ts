import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab3MenuPage } from './tab3-menu.page';

const routes: Routes = [
  {
    path: '',
    component: Tab3MenuPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab3MenuPageRoutingModule {}
