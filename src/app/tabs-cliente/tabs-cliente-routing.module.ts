import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TabsClientePage } from './tabs-cliente.page';

const routes: Routes = [
  {
    path: '',
    component: TabsClientePage,
    children: [
      {
        path: 'tab1-menu-anonimo',
        loadChildren: () =>
          import('./tab1-menu-anonimo/tab1-menu-anonimo.module').then(
            (m) => m.Tab1MenuAnonimoPageModule
          ),
      },
      {
        path: 'tab2-pedido-anonimo',
        loadChildren: () =>
          import('./tab2-pedido-anonimo/tab2-pedido-anonimo.module').then(
            (m) => m.Tab2PedidoAnonimoPageModule
          ),
      },
      {
        path: 'tab3-consulta-anonimo',
        loadChildren: () =>
          import('./tab3-consulta-anonimo/tab3-consulta-anonimo.module').then(
            (m) => m.Tab3ConsultaAnonimoPageModule
          ),
      },
      {
        path: 'ingreso-anonimo',
        loadChildren: () =>
          import('./ingreso-anonimo/ingreso-anonimo.module').then(
            (m) => m.IngresoAnonimoPageModule
          ),
      },
      {
        path: 'tabs-cliente',
        loadChildren: () =>
          import('./tabs-cliente.module').then((m) => m.TabsClientePageModule),
      },
      {
        path: '',
        redirectTo: '/tabs-cliente/tab1-menu-anonimo',
        pathMatch: 'full',
      },
    ],
  },  {
    path: 'tab4-resultados-anonimo',
    loadChildren: () => import('./tab4-resultados-anonimo/tab4-resultados-anonimo.module').then( m => m.Tab4ResultadosAnonimoPageModule)
  },
  {
    path: 'tab5-cuenta-anonimo',
    loadChildren: () => import('./tab5-cuenta-anonimo/tab5-cuenta-anonimo.module').then( m => m.Tab5CuentaAnonimoPageModule)
  },
  {
    path: 'tab6-historial-anonimo',
    loadChildren: () => import('./tab6-historial-anonimo/tab6-historial-anonimo.module').then( m => m.Tab6HistorialAnonimoPageModule)
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsClienteAnonimoPageRoutingModule {}
