import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsMozoPage } from './tabs-mozo.page';

const routes: Routes = [
  {
    path: '',
    component: TabsMozoPage,
    children: [
      {
        path: 'tab1-pedidos-pendientes',
        loadChildren: () => import('./tab1-pedidos-pendientes/tab1-pedidos-pendientes.module').then(m => m.Tab1PedidosPendientesPageModule)
      },
      {
        path: 'tab2-pedidos-confirmados',
        loadChildren: () => import('./tab2-pedidos-confirmados/tab2-pedidos-confirmados.module').then(m => m.Tab2PedidosConfirmadosPageModule)
      },
      {
        path: 'tab3-consultas',
        loadChildren: () => import('./tab3-consultas/tab3-consultas.module').then(m => m.Tab3ConsultasPageModule)
      },
      {
        path: '',
        redirectTo: 'tab1-pedidos-pendientes',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'chat',
    loadChildren: () => import('./tab3-consultas/chat/chat.module').then( m => m.ChatPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsMozoPageRoutingModule {}