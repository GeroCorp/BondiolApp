import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PreSalaPageRoutingModule } from './pre-sala-routing.module';

import { PreSalaPage } from './pre-sala.page';

import { MainButtonComponent } from 'src/app/components/main-button/main-button.component';
import { SecondaryButtonComponent } from 'src/app/components/secondary-button/secondary-button.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PreSalaPageRoutingModule,
    MainButtonComponent,
    SecondaryButtonComponent
  ],
  declarations: [PreSalaPage]
})
export class PreSalaPageModule {}
