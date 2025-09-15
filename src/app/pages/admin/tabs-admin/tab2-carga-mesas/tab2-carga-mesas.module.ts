import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab2CargaMesasPageRoutingModule } from './tab2-carga-mesas-routing.module';

import { Tab2CargaMesasPage } from './tab2-carga-mesas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab2CargaMesasPageRoutingModule
  ],
  declarations: [Tab2CargaMesasPage]
})
export class Tab2CargaMesasPageModule {}
