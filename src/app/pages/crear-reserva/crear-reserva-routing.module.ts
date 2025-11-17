import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CrearReservaPage } from './crear-reserva.page';

const routes: Routes = [
  {
    path: '',
    component: CrearReservaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CrearReservaPageRoutingModule {}
