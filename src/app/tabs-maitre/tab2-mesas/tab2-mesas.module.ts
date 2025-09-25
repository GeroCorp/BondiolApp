import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab2MesasPageRoutingModule } from './tab2-mesas-routing.module';

import { Tab2Mesas } from './tab2-mesas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab2MesasPageRoutingModule
  ],
  declarations: [Tab2Mesas]
})
export class Tab2MesasPageModule {}
