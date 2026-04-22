import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { Tab3MenuPageRoutingModule } from './tab3-menu-routing.module';

import { Tab3MenuPage } from './tab3-menu.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab3MenuPageRoutingModule
  ],
  declarations: [Tab3MenuPage]
})
export class Tab3MenuPageModule {}
