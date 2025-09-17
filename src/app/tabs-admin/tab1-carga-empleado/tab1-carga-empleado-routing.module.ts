import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab1CargaEmpleadoPage } from './tab1-carga-empleado.page';

const routes: Routes = [
  {
    path: '',
    component: Tab1CargaEmpleadoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab1CargaEmpleadoPageRoutingModule {}
