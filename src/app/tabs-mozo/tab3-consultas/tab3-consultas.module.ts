import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { Tab3ConsultasPageRoutingModule } from './tab3-consultas-routing.module';
import { Tab3ConsultasPage } from './tab3-consultas.page';
import { SecondaryButtonComponent } from 'src/app/components/secondary-button/secondary-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab3ConsultasPageRoutingModule,
    SecondaryButtonComponent
  ],
  declarations: [Tab3ConsultasPage]
})
export class Tab3ConsultasPageModule {}
