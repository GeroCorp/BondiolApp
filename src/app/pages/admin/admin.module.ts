import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,   // 🔑 Necesario para que reconozca <ion-*>
    RouterModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
