import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab1MenuPageRoutingModule } from './tab1-menu-routing.module';

import { Tab1MenuPage } from './tab1-menu.page';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab1MenuPageRoutingModule,
  ],
  declarations: [Tab1MenuPage]
})
export class Tab1MenuPageModule {}
