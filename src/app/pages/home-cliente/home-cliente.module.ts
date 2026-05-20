import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HomeClientePageRoutingModule } from './home-cliente-routing.module';
import { HomeClientePage } from './home-cliente.page';

import { MainButtonComponent } from 'src/app/components/main-button/main-button.component';
import { SecondaryButtonComponent } from 'src/app/components/secondary-button/secondary-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomeClientePageRoutingModule,
    MainButtonComponent,
    SecondaryButtonComponent
  ],
  declarations: [HomeClientePage]
})
export class HomeClientePageModule {}
