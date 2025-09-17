import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab1AgregarProductoPage } from './tab1-agregar-producto.page';

const routes: Routes = [
  {
    path: '',
    component: Tab1AgregarProductoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab1AgregarProductoPageRoutingModule {}
