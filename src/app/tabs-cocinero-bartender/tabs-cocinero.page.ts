import { Component, OnInit, signal } from '@angular/core';
import { PerfilService } from '../services/perfilService';
import { AuthService } from '../services/supabase';

@Component({
  selector: 'app-tabs-cocinero',
  standalone: false,
  templateUrl: './tabs-cocinero.page.html',
  styleUrls: ['./tabs-cocinero.page.scss'],
})
export class TabsCocineroPage implements OnInit{
  perfil = signal<string | null>(null);

  constructor(
    private perfilService: PerfilService,
    private authService: AuthService
  ) {  }

  async ngOnInit() {
    try {
      const perfilData = await this.authService.getUsuarioConPerfil();
      this.perfil.set(perfilData ? perfilData.perfil : "");

    } catch (error) {
      console.error('Error al cargar el perfil:', error);
    }
    
    
  }

}
