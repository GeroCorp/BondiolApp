import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TabsMaitrePageRoutingModule } from './tabs-maitre-routing.module';

import { TabsMaitrePage } from './tabs-maitre.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabsMaitrePageRoutingModule
  ],
  declarations: [TabsMaitrePage]
})
export class TabsMaitrePageModule {}
