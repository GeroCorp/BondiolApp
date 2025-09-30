import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TabsMozoPageRoutingModule } from './tabs-mozo-routing.module';

import { TabsMozoPage } from './tabs-mozo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabsMozoPageRoutingModule
  ],
  declarations: [TabsMozoPage]
})
export class TabsMozoPageModule {}
