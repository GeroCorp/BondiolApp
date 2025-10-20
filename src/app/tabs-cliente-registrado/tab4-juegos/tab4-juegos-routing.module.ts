import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab4JuegosPage } from './tab4-juegos.page';

const routes: Routes = [
  {
    path: '',
    component: Tab4JuegosPage
  },  {
    path: 'juego-memoria',
    loadChildren: () => import('./juego-memoria/juego-memoria.module').then( m => m.JuegoMemoriaPageModule)
  },
  {
    path: 'juego-adivinanza',
    loadChildren: () => import('./juego-adivinanza/juego-adivinanza.module').then( m => m.JuegoAdivinanzaPageModule)
  },
  {
    path: 'juego-ruleta',
    loadChildren: () => import('./juego-ruleta/juego-ruleta.module').then( m => m.JuegoRuletaPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab4JuegosPageRoutingModule {}
