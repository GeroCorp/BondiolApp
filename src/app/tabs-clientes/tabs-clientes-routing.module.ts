import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsClientesPage } from './tabs-clientes.page';

const routes: Routes = [
  {
    path: '',
    component: TabsClientesPage,
    children: [
      {
        path: 'tab1-menu',
        loadChildren: () => import('./tab1-menu/tab1-menu.module').then( m => m.Tab1MenuPageModule)
      },
      {
        path: '',
        redirectTo: 'tab1-menu',
        pathMatch: 'full',
      }
    ]
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsClientesPageRoutingModule {}
