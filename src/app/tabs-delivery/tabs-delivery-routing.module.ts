import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsDeliveryPage } from './tabs-delivery.page';

const routes: Routes = [
  {
    path: '',
    component: TabsDeliveryPage
  },  {
    path: 'tab1-pedidos',
    loadChildren: () => import('./tab1-pedidos/tab1-pedidos.module').then( m => m.Tab1PedidosPageModule)
  },
  {
    path: 'tab2-menu-chats',
    loadChildren: () => import('./tab2-menu-chats/tab2-menu-chats.module').then( m => m.Tab2MenuChatsPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsDeliveryPageRoutingModule {}
