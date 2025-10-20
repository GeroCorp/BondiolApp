import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsClienteRegistradoPage } from './tabs-cliente-registrado.page';

const routes: Routes = [
  {
    path: '',
    component: TabsClienteRegistradoPage
  },
  {
    path: 'tab1-menu',
    loadChildren: () => import('./tab1-menu/tab1-menu.module').then( m => m.Tab1MenuPageModule)
  },
  {
    path: 'tab2-pedido',
    loadChildren: () => import('./tab2-pedido/tab2-pedido.module').then( m => m.Tab2PedidoPageModule)
  },
  {
    path: 'tab3-consulta',
    loadChildren: () => import('./tab3-consulta/tab3-consulta.module').then( m => m.Tab3ConsultaPageModule)
  },
  {
    path: 'tab4-juegos',
    loadChildren: () => import('./tab4-juegos/tab4-juegos.module').then(m => m.Tab4JuegosPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsClienteRegistradoPageRoutingModule {}
