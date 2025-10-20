import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { Tab4JuegosPage } from './tab4-juegos.page';
import { JuegoMemoriaPage } from './juego-memoria/juego-memoria.page';
import { JuegoAdivinanzaPage } from './juego-adivinanza/juego-adivinanza.page';
import { JuegoRuletaPage } from './juego-ruleta/juego-ruleta.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: Tab4JuegosPage
      }
    ])
  ],
  declarations: [
    Tab4JuegosPage,
    JuegoMemoriaPage,
    JuegoAdivinanzaPage,
    JuegoRuletaPage
  ]
})
export class Tab4JuegosPageModule {}