import { Component, signal } from '@angular/core';
import { PerfilService } from 'src/app/services/perfilService';
import { AuthService } from 'src/app/services/supabase';


@Component({
  selector: 'app-tab3-admin-cliente',
  templateUrl: './tab4-admin-mesa.page.html',
  styleUrls: ['./tab4-admin-mesa.page.scss'],
  standalone: false
})
export class Tab4AdminMesaPage {
  perfil: string | null = null
  readonly mesas = signal<any[]>([]);


  constructor(
    private perfilService: PerfilService,
    private authService: AuthService
  ) { 
    this.perfil = this.perfilService.getPerfil();
    console.log('Perfil recibido en Tabs admin:', this.perfil);
  }

  async ngOnInit() {
    try {
      this.actualizacionSupabase();
      
    }catch (error) {
      console.error('Error inesperado al obtener mesas:', error);
    }

  }
  
  async cargarMesas() {
    const { data } = await this.authService.obtenerMesas();
    this.mesas.set(data ?? []);
  }

  actualizacionSupabase(){
    this.cargarMesas();
    this.authService.actualizacionesMesas(() => {
      this.cargarMesas();
    });
  }


  eliminarMesa(id: number) {
    console.log('Eliminar mesa con ID:', id);
    try{
      // Eliminar mesa de la base de datos
    this.authService.eliminarMesa(id)
    .then(() => {
      console.log('Mesa eliminada con ID:', id);
      this.cargarMesas(); // Recargar las mesas después de eliminar
    })
    }catch(e){
      console.error('Error al eliminar la mesa:', e);
      
    }

  }
}