import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { TabsMaitrePageRoutingModule } from './tabs-maitre-routing.module';
import { TabsMaitreComponent } from './tabs-maitre.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabsMaitrePageRoutingModule,
    TabsMaitreComponent
  ]
})
export class TabsMaitreModule {}
