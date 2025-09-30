import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-pre-sala',
  templateUrl: './pre-sala.page.html',
  styleUrls: ['./pre-sala.page.scss'],
  standalone: false
})
export class PreSalaPage implements OnInit {
  clienteNombre: string = '';
  clienteEmail: string = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // Obtener datos del cliente actual
    const user = await this.authService.getCurrentUser();
    
    if (user) {
      const cliente = await this.authService.getClienteByUserId(user.id);
      
      if (cliente) {
        this.clienteNombre = cliente.nombre;
        this.clienteEmail = cliente.email || user.email || '';
      }
    }
  }

  async volverAlLogin() {
    await this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
