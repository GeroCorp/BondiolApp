import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { JuegoMozoPageRoutingModule } from './juego-mozo-routing.module';

import { JuegoMozoPage } from './juego-mozo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    JuegoMozoPageRoutingModule
  ],
  declarations: [JuegoMozoPage]
})
export class JuegoMozoPageModule {}
