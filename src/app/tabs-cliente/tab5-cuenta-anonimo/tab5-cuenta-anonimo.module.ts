import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab5CuentaAnonimoPageRoutingModule } from './tab5-cuenta-anonimo-routing.module';

import { Tab5CuentaAnonimoPage } from './tab5-cuenta-anonimo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab5CuentaAnonimoPageRoutingModule
  ],
  declarations: [Tab5CuentaAnonimoPage]
})
export class Tab5CuentaAnonimoPageModule {}
