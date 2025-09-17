import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TabsCocineroPageRoutingModule } from './tabs-cocinero-routing.module';

import { TabsCocineroPage } from './tabs-cocinero.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabsCocineroPageRoutingModule
  ],
  declarations: [TabsCocineroPage]
})
export class TabsCocineroPageModule {}
