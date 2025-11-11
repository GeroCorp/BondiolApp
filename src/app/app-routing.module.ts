import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  },
  {
    path: 'splash',
    loadChildren: () => import('./pages/splash/splash.module').then(m => m.SplashPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule),
  },
  {
    path: 'pre-sala',
    loadChildren: () => import('./pages/pre-sala/pre-sala.module').then( m => m.PreSalaPageModule)
  },
  {
    path: 'home-cliente',
    loadChildren: () => import('./pages/home-cliente/home-cliente.module').then( m => m.HomeClientePageModule)
  },
  {
    path: 'crear-reserva',
    loadChildren: () => import('./pages/crear-reserva/crear-reserva.module').then( m => m.CrearReservaPageModule)
  },
  {
    path: 'gestion-reservas',
    loadChildren: () => import('./pages/gestion-reservas/gestion-reservas.module').then( m => m.GestionReservasPageModule)
  },
  {
    path: 'tabs-admin',
    loadChildren: () => import('./tabs-admin/tabs-admin.module').then( m => m.TabsAdminPageModule)
  },
  {
    path: 'tabs-cocinero-bartender',
    loadChildren: () => import('./tabs-cocinero-bartender/tabs-cocinero.module').then( m => m.TabsCocineroPageModule)
  },
  {
    path: 'tabs-maitre',
    loadChildren: () => import('./tabs-maitre/tabs-maitre.module').then(m => m.TabsMaitrePageModule)
  },
  {
    path: 'tabs-mozo',
    loadChildren: () => import('./tabs-mozo/tabs-mozo.module').then(m => m.TabsMozoPageModule)
  },
  {
    path: 'tabs-cliente-registrado',
    loadChildren: () => import('./tabs-cliente-registrado/tabs-cliente-registrado.module').then( m => m.TabsClienteRegistradoPageModule)
  },
  {
    path: 'lista-espera-cliente',
    loadChildren: () => import('./pages/lista-espera-cliente/lista-espera-cliente.module').then( m => m.ListaEsperaClientePageModule)
  },
  {
    path: 'ingreso-anonimo',
    loadChildren: () => import('./pages/ingreso-anonimo/ingreso-anonimo.module').then(m => m.IngresoAnonimoPageModule)
  },
  {
    path: 'generador-qr-mesas',
    loadChildren: () => import('./pages/generador-qr-mesas/generador-qr-mesas.module').then(m => m.GeneradorQrMesasPageModule)
  },
  {
    path: 'auth-callback',
    loadChildren: () => import('./pages/auth-callback/auth-callback.module').then( m => m.AuthCallbackPageModule)
  },
  {
    path: '**',
    redirectTo: 'splash',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { 
      preloadingStrategy: PreloadAllModules,
      enableTracing: false
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}