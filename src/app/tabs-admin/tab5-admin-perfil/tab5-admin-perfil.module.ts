import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab5AdminPerfilPageRoutingModule } from './tab5-admin-perfil-routing.module';

import { Tab5AdminPerfilPage } from './tab5-admin-perfil.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab5AdminPerfilPageRoutingModule
  ],
  declarations: [Tab5AdminPerfilPage]
})
export class Tab5AdminPerfilPageModule {}
