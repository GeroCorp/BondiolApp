import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { Tab5JuegosPage } from './tab5-juegos.page';
import { JuegoMemoriaPage } from './juego-memoria/juego-memoria.page';
import { JuegoAdivinanzaPage } from './juego-adivinanza/juego-adivinanza.page';
import { JuegoRuletaPage } from './juego-ruleta/juego-ruleta.page';
import { JuegoMozoComponent } from './juego-mozo/juego-mozo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: Tab5JuegosPage
      }
    ])
  ],
  declarations: [
    Tab5JuegosPage,
    JuegoMemoriaPage,
    JuegoAdivinanzaPage,
    JuegoRuletaPage,
    JuegoMozoComponent
  ]
})
export class Tab5JuegosPageModule {}