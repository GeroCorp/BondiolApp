import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsCocineroPage } from './tabs-cocinero.page';

const routes: Routes = [
  {
    path: '',
    component: TabsCocineroPage,
    children: [
      {
        path: 'tab1-agregar-producto',
        loadChildren: () => import('./tab1-agregar-producto/tab1-agregar-producto.module').then( m => m.Tab1AgregarProductoPageModule)
      },
      {
        path: 'tab2-recibir-pedido',
        loadChildren: () => import('./tab2-recibir-pedido/tab2-recibir-pedido.module').then( m => m.Tab2RecibirPedidoPageModule)
      },
      {
        path: '',
        redirectTo: 'tab1-agregar-producto',
        pathMatch: 'full',
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsCocineroPageRoutingModule {}
