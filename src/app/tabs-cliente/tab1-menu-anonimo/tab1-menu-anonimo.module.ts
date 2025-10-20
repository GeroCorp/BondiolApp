import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab1MenuAnonimoPageRoutingModule } from './tab1-menu-anonimo-routing.module';

import { Tab1MenuAnonimoPage } from './tab1-menu-anonimo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab1MenuAnonimoPageRoutingModule
  ],
  declarations: [Tab1MenuAnonimoPage]
})
export class Tab1MenuAnonimoPageModule {}
