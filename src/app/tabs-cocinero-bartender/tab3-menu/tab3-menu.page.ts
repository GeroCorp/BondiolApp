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
      console.error('Error inesperado al obtener productos:', error);
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

  getFirstImage(imagenes: any): string {
    try {
      if (!imagenes) {
        console.warn('No hay imágenes disponibles');
        return 'assets/placeholder.png';
      }
      
      if (typeof imagenes === 'string') {
        try {
          const imagenesArray = JSON.parse(imagenes);
          if (Array.isArray(imagenesArray) && imagenesArray.length > 0) {
            console.log('Imagen parseada:', imagenesArray[0]);
            return imagenesArray[0];
          }
        } catch (parseError) {
          console.error('Error al parsear JSON de imágenes:', parseError);
          return 'assets/placeholder.png';
        }
      }
      
      if (Array.isArray(imagenes) && imagenes.length > 0) {
        console.log('Imagen desde array:', imagenes[0]);
        return imagenes[0];
      }
      
      console.warn('Formato de imágenes no reconocido:', imagenes);
      return 'assets/placeholder.png';
    } catch (error) {
      console.error('Error obteniendo primera imagen:', error);
      return 'assets/placeholder.png';
    }
  }
}