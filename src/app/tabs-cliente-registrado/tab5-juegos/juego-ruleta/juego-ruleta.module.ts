import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { JuegoRuletaPageRoutingModule } from './juego-ruleta-routing.module';

import { JuegoRuletaPage } from './juego-ruleta.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    JuegoRuletaPageRoutingModule
  ],
  declarations: [JuegoRuletaPage]
})
export class JuegoRuletaPageModule {}
