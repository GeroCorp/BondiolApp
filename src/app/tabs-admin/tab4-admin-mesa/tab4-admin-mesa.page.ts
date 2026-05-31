import { Component, signal, OnInit } from '@angular/core';
import { PerfilService } from 'src/app/services/perfilService';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-tab4-admin-mesa',
  templateUrl: './tab4-admin-mesa.page.html',
  styleUrls: ['./tab4-admin-mesa.page.scss'],
  standalone: false
})
export class Tab4AdminMesaPage implements OnInit {
  perfil: string | null = null;
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
      await this.cargarMesas();
    } catch (error) {
      console.error('Error inesperado al obtener mesas:', error);
    }
  }
  
  // 🔹 Cargar todas las mesas con estado
  async cargarMesas() {
    try {
      const data = await this.authService.getMesasConEstado(); // me traje la foto tambien 
      this.mesas.set(data ?? []);
      console.log('Mesas cargadas:', data);
    } catch (error) {
      console.error('Error cargando mesas:', error);
    }
  }

  // 🔹 Eliminar mesa
  async eliminarMesa(id: number) {
    console.log('Eliminar mesa con ID:', id);
    try {
      await this.authService.liberarMesa(id); // si solo quieres liberar
      // o si querés eliminar completamente:
      // await this.authService.eliminarMesa(id); // si implementas eliminarMesa()
      console.log('Mesa eliminada/liberada con ID:', id);
      await this.cargarMesas();
    } catch(e) {
      console.error('Error al eliminar/liberar la mesa:', e);
    }
  }

  // 🔹 Asignar mesa a cliente anónimo
  async asignarMesaClienteAnonimo(idCliente: number, numeroMesa: number) {
    try {
      await this.authService.asignarMesaAClienteAnonimo(idCliente, numeroMesa);
      console.log('Mesa asignada a cliente:', idCliente);
      await this.cargarMesas();
    } catch(e) {
      console.error('Error asignando mesa a cliente:', e);
    }
  }

  // 🔹 Liberar mesa
  async liberarMesa(idMesa: number) {
    try {
      await this.authService.liberarMesa(idMesa);
      console.log('Mesa liberada:', idMesa);
      await this.cargarMesas();
    } catch(e) {
      console.error('Error liberando mesa:', e);
    }
  }

  handleImageError(event: any) {
  const img = event.target;

  if (!img.dataset.errorHandled) {
    img.src = 'assets/images/placeholder.png';
    img.dataset.errorHandled = true;
  }
}

mesaSeleccionada: any = null;
modalAbierto = false;

abrirModal(mesa: any) {
  this.mesaSeleccionada = mesa;
  this.modalAbierto = true;
}

cerrarModal() {
  this.modalAbierto = false;
  this.mesaSeleccionada = null;
}

async handleRefresh(event: any) {
  await this.cargarMesas();
  event.target.complete();
}
}
