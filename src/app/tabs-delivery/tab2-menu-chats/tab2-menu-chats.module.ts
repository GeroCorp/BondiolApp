import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab2MenuChatsPageRoutingModule } from './tab2-menu-chats-routing.module';

import { Tab2MenuChatsPage } from './tab2-menu-chats.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab2MenuChatsPageRoutingModule
  ],
  declarations: [Tab2MenuChatsPage]
})
export class Tab2MenuChatsPageModule {}
