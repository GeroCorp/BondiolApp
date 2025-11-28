import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab2MenuChatsPage } from './tab2-menu-chats.page';

const routes: Routes = [
  {
    path: '',
    component: Tab2MenuChatsPage
  },
  {
    path: 'chat/:id_pedido',
    loadChildren: () => import('./chat/chat.module').then( m => m.ChatPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab2MenuChatsPageRoutingModule {}
