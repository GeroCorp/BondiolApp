import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab6HistorialAnonimoPageRoutingModule } from './tab6-historial-anonimo-routing.module';

import { Tab6HistorialAnonimoPage } from './tab6-historial-anonimo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab6HistorialAnonimoPageRoutingModule
  ],
  declarations: [Tab6HistorialAnonimoPage]
})
export class Tab6HistorialAnonimoPageModule {}
