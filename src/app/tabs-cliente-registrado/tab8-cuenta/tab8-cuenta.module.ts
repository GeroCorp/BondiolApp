import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab8CuentaPageRoutingModule } from './tab8-cuenta-routing.module';

import { Tab8CuentaPage } from './tab8-cuenta.page';

import { SecondaryButtonComponent } from 'src/app/components/secondary-button/secondary-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab8CuentaPageRoutingModule,
    SecondaryButtonComponent
  ],
  declarations: [Tab8CuentaPage]
})
export class Tab8CuentaPageModule {}
