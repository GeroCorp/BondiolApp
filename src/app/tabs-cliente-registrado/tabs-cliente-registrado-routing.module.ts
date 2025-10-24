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
    path: 'tab4-historial',
    loadChildren: () => import('./tab4-historial/tab4-historial.module').then( m => m.Tab4HistorialPageModule)
  },
  {
    path: 'tab5-juegos',
    loadChildren: () => import('./tab5-juegos/tab5-juegos.module').then( m => m.Tab5JuegosPageModule)
  },
  {
    path: 'tab6-encuesta',
    loadChildren: () => import('./tab6-encuesta/tab6-encuesta.module').then( m => m.Tab6EncuestaPageModule)
  },
  {
    path: 'tab7-resultados',
    loadChildren: () => import('./tab7-resultados/tab7-resultados.module').then( m => m.Tab7ResultadosPageModule)
  },
  {
    path: 'tab8-cuenta',
    loadChildren: () => import('./tab8-cuenta/tab8-cuenta.module').then( m => m.Tab8CuentaPageModule)
  }

  

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsClienteRegistradoPageRoutingModule {}
