import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab6EncuestasPageRoutingModule } from './tab6-encuestas-routing.module';

import { Tab6EncuestasPage } from './tab6-encuestas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab6EncuestasPageRoutingModule
  ],
  declarations: [Tab6EncuestasPage]
})
export class Tab6EncuestasPageModule {}
