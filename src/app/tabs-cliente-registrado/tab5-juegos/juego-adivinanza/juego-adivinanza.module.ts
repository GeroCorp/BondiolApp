import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { JuegoAdivinanzaPageRoutingModule } from './juego-adivinanza-routing.module';

import { JuegoAdivinanzaPage } from './juego-adivinanza.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    JuegoAdivinanzaPageRoutingModule
  ],
  declarations: [JuegoAdivinanzaPage]
})
export class JuegoAdivinanzaPageModule {}
