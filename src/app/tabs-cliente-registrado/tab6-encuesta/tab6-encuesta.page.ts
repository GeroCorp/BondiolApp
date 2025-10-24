import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { EncuestaService } from 'src/app/services/encuesta.service';

@Component({
  selector: 'app-tab6-encuesta',
  templateUrl: './tab6-encuesta.page.html',
  styleUrls: ['./tab6-encuesta.page.scss'],
  standalone: false,
})
export class Tab6EncuestaPage implements OnInit {
  yaRespondio: boolean = false; // ✅ Solo boolean, no null
  enviando = false;
  
  respuestas = {
    calidadComida: 0,
    calidadServicio: 0,
    ambiente: 0,
    precioCalidad: 0,
    recomendaria: null as boolean | null,
    comentarios: ''
  };

  // ✅ Públicas para el HTML
  public clienteId: number = 0;
  public mesaId: number = 0;

  constructor(
    private router: Router,
    private clienteService: ClienteService,
    private encuestaService: EncuestaService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    await this.verificarEstadoEncuesta();
  }

  async verificarEstadoEncuesta() {
    try {
      this.clienteId = await this.clienteService.getClientId();
      
      // ✅ Obtener el ID de la mesa
      this.mesaId = await this.clienteService.getMesaID(this.clienteId);

      console.log('📋 Datos cliente completos:', {
        clienteId: this.clienteId,
        mesaId: this.mesaId
      });

      if (!this.mesaId) {
        console.log('⚠️ No hay mesa asignada');
        this.showToast('No tienes una mesa asignada', 'warning');
        this.router.navigate(['/home-cliente']);
        return;
      }

      // ✅ Permitir SIEMPRE responder la encuesta
      this.yaRespondio = false;

      console.log('✅ Cliente puede responder encuesta libremente');
      
    } catch (error) {
      console.error('❌ Error verificando encuesta:', error);
      this.showToast('Error al cargar la encuesta', 'danger');
      this.yaRespondio = false;
    }
  }

  setRating(categoria: string, valor: number) {
    (this.respuestas as any)[categoria] = valor;
  }

  formularioCompleto(): boolean {
    return (
      this.respuestas.calidadComida > 0 &&
      this.respuestas.calidadServicio > 0 &&
      this.respuestas.ambiente > 0 &&
      this.respuestas.precioCalidad > 0 &&
      this.respuestas.recomendaria !== null
    );
  }

  async enviarEncuesta() {
    if (!this.formularioCompleto()) {
      this.showToast('Por favor completa todas las preguntas', 'warning');
      return;
    }

    // ✅ Validar datos necesarios
    if (!this.clienteId || !this.mesaId) {
      console.error('❌ Faltan datos:', { clienteId: this.clienteId, mesaId: this.mesaId });
      this.showToast('Error: Datos de cliente o mesa no disponibles', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Enviando encuesta...',
      spinner: 'crescent',
    });
    await loading.present();

    this.enviando = true;

    try {
      console.log('📤 Enviando encuesta con datos:', {
        clienteId: this.clienteId,
        mesaId: this.mesaId,
        respuestas: this.respuestas
      });

      await this.encuestaService.guardarRespuestas(
        this.clienteId,
        this.mesaId,
        this.respuestas
      );

      await loading.dismiss();
      this.enviando = false;

      this.showToast(
        '¡Gracias por tu opinión! Tu encuesta ha sido enviada correctamente',
        'success'
      );

      // ✅ Limpiar el formulario para nueva respuesta
      this.respuestas = {
        calidadComida: 0,
        calidadServicio: 0,
        ambiente: 0,
        precioCalidad: 0,
        recomendaria: null,
        comentarios: ''
      };

      // ✅ Redirigir a resultados después de 2 segundos
      setTimeout(() => {
        this.verResultados();
      }, 2000);

    } catch (error: any) {
      await loading.dismiss();
      this.enviando = false;
      console.error('❌ Error enviando encuesta:', error);
      
      const errorMsg = error?.message || 'Error desconocido';
      this.showToast(`Error al enviar la encuesta: ${errorMsg}`, 'danger');
    }
  }

  async verResultados() {
    this.router.navigate(['/tabs-cliente-registrado/tab7-resultados']);
  }

  // ✅ Método para el ion-refresher
  async handleRefresh(event: any) {
    try {
      await this.verificarEstadoEncuesta();
      event.target.complete();
    } catch (error) {
      console.error('Error al refrescar:', error);
      event.target.complete();
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'medium' | 'warning'
  ) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}