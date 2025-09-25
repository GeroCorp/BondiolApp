import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab1EsperaPageRoutingModule } from './tab1-espera-routing.module';

import { Tab1Espera } from './tab1-espera.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab1EsperaPageRoutingModule
  ],
  declarations: [Tab1Espera]
})
export class Tab1EsperaPageModule {}
