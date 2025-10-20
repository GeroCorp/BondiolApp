import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { HomeAnonimoPage } from './home-anonimo.page';

const routes: Routes = [
  {
    path: '',
    component: HomeAnonimoPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [HomeAnonimoPage]
})
export class HomeAnonimoPageModule {}