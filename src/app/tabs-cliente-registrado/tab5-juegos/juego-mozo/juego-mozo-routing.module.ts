import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { JuegoMozoPage } from './juego-mozo.page';

const routes: Routes = [
  {
    path: '',
    component: JuegoMozoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JuegoMozoPageRoutingModule {}
