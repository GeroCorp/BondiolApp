import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab5JuegosPage } from './tab5-juegos.page';

const routes: Routes = [
  {
    path: '',
    component: Tab5JuegosPage
  },
  {
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
  },  {
    path: 'juego-mozo',
    loadChildren: () => import('./juego-mozo/juego-mozo.module').then( m => m.JuegoMozoPageModule)
  }


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab5JuegosPageRoutingModule {}
