import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab1MenuAnonimoPage } from './tab1-menu-anonimo.page';

const routes: Routes = [
  {
    path: '',
    component: Tab1MenuAnonimoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab1MenuAnonimoPageRoutingModule {}
