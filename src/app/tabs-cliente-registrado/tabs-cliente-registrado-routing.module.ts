import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsClienteRegistradoPage } from './tabs-cliente-registrado.page';

const routes: Routes = [
  {
    path: '',
    component: TabsClienteRegistradoPage
  },  {
    path: 'tab1-menu',
    loadChildren: () => import('./tab1-menu/tab1-menu.module').then( m => m.Tab1MenuPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsClienteRegistradoPageRoutingModule {}
