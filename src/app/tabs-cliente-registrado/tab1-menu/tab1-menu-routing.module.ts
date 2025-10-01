import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab1MenuPage } from './tab1-menu.page';

const routes: Routes = [
  {
    path: '',
    component: Tab1MenuPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab1MenuPageRoutingModule {}
