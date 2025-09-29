import { Component } from '@angular/core';
import { AuthService } from '../services/supabase';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs-clientes',
  templateUrl: './tabs-clientes.page.html',
  styleUrls: ['./tabs-clientes.page.scss'],
  standalone: false,
})
export class TabsClientesPage  {

  constructor(private authService: AuthService, private router: Router) { }

  

  logout() {
    this.authService.logout();
    // Redirigir a la página de inicio de sesión
    this.router.navigate(['/login']);
  }

}


