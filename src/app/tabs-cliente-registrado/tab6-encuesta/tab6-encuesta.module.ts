import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab6EncuestaPageRoutingModule } from './tab6-encuesta-routing.module';

import { Tab6EncuestaPage } from './tab6-encuesta.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab6EncuestaPageRoutingModule
  ],
  declarations: [Tab6EncuestaPage]
})
export class Tab6EncuestaPageModule {}
