import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { JuegoAdivinanzaPage } from './juego-adivinanza.page';

const routes: Routes = [
  {
    path: '',
    component: JuegoAdivinanzaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JuegoAdivinanzaPageRoutingModule {}
