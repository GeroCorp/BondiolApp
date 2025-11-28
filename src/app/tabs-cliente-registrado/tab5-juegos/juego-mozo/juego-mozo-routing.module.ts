import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { JuegoMozoComponent } from './juego-mozo.page';

const routes: Routes = [
  {
    path: '',
    component: JuegoMozoComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JuegoMozoPageRoutingModule {}
