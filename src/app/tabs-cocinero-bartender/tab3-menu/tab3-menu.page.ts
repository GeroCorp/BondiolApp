import { Component, OnInit, signal } from '@angular/core';
import { PerfilService } from 'src/app/services/perfilService';
import { AuthService } from 'src/app/services/supabase';
@Component({
  selector: 'app-tab3-menu',
  templateUrl: './tab3-menu.page.html',
  styleUrls: ['./tab3-menu.page.scss'],
  standalone: false
})
export class Tab3MenuPage implements OnInit {
  perfil: string | null = null;
  readonly platos = signal<any[]>([]);
  readonly bebidas = signal<any[]>([]);

  constructor(
    private perfilService: PerfilService,
    private authService: AuthService
  ) { 
    this.perfil = this.perfilService.getPerfil();
    console.log('Perfil recibido en Tabs cocinero/bartender:', this.perfil);
  }

  async ngOnInit() {

    try {
      if (this.perfil === 'cocinero') {
        await this.cargarPlatos();
      } else {
        await this.cargarBebidas();
      }
    } catch (error) {
      console.error('Error inesperado al obtener platos:', error);
    }

  }

  async cargarPlatos() {
    try {
      const data = await this.authService.getPlatos(); 
      this.platos.set(data ?? []);
      console.log('Platos cargados:', data);
    } catch (error) {
      console.error('Error cargando platos:', error);
    }
  }

  async cargarBebidas() {
    try {
      const data = await this.authService.getBebidas();
      this.bebidas.set(data ?? []);
      console.log('Bebidas cargadas:', data);
    } catch (error) {
      console.error('Error cargando bebidas:', error);
    }
  
  }

}
