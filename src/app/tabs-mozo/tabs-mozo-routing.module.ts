import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsMozoPage } from './tabs-mozo.page';

const routes: Routes = [
  {
    path: '',
    component: TabsMozoPage
  },  {
    path: 'tab1-pedidos-pendientes',
    loadChildren: () => import('./tab1-pedidos-pendientes/tab1-pedidos-pendientes.module').then( m => m.Tab1PedidosPendientesPageModule)
  },
  {
    path: 'tab2-pedidos-confirmados',
    loadChildren: () => import('./tab2-pedidos-confirmados/tab2-pedidos-confirmados.module').then( m => m.Tab2PedidosConfirmadosPageModule)
  },
  {
    path: 'tab3-consultas',
    loadChildren: () => import('./tab3-consultas/tab3-consultas.module').then( m => m.Tab3ConsultasPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsMozoPageRoutingModule {}
