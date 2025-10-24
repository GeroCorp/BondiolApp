import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { EncuestaService } from 'src/app/services/encuesta.service';

@Component({
  selector: 'app-tab7-resultados',
  templateUrl: './tab7-resultados.page.html',
  styleUrls: ['./tab7-resultados.page.scss'],
  standalone: false,
})
export class Tab7ResultadosPage implements OnInit {
  resultados: any = null;
  cargando = true;

  constructor(
    private encuestaService: EncuestaService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.cargarResultados();
  }

  async cargarResultados() {
    this.cargando = true;
    try {
      this.resultados = await this.encuestaService.obtenerResultados();
      console.log('✅ Resultados cargados:', this.resultados);
    } catch (error) {
      console.error('❌ Error cargando resultados:', error);
      this.showToast('Error al cargar los resultados', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async recargar() {
    await this.cargarResultados();
    this.showToast('Resultados actualizados', 'medium');
  }

  async handleRefresh(event: any) {
    await this.cargarResultados();
    event.target.complete();
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}