import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab3ConsultaPageRoutingModule } from './tab3-consulta-routing.module';

import { Tab3ConsultaPage } from './tab3-consulta.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab3ConsultaPageRoutingModule
  ],
  declarations: [Tab3ConsultaPage]
})
export class Tab3ConsultaPageModule {}
