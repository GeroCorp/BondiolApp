import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab4PerfilPageRoutingModule } from './tab4-perfil-routing.module';

import { Tab4PerfilPage } from './tab4-perfil.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab4PerfilPageRoutingModule
  ],
  declarations: [Tab4PerfilPage]
})
export class Tab4PerfilPageModule {}
