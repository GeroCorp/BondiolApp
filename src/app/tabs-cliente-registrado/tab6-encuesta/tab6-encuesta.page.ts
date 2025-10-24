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
  yaRespondio = false;
  enviando = false;
  
  respuestas = {
    calidadComida: 0,
    calidadServicio: 0,
    ambiente: 0,
    precioCalidad: 0,
    recomendaria: null as boolean | null,
    comentarios: ''
  };

  private clienteId: number = 0;
  private mesaId: number = 0;

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
      this.mesaId = await this.clienteService.getMesa(this.clienteId);

      if (!this.mesaId) {
        this.showToast('No tienes una mesa asignada', 'warning');
        this.router.navigate(['/home-cliente']);
        return;
      }

      this.yaRespondio = await this.encuestaService.yaRespondiEncuesta(
        this.clienteId,
        this.mesaId
      );

      if (this.yaRespondio) {
        this.showToast('Ya has respondido la encuesta para esta estadía', 'medium');
      }
    } catch (error) {
      console.error('Error verificando encuesta:', error);
      this.showToast('Error al verificar encuesta', 'danger');
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

    const loading = await this.loadingController.create({
      message: 'Enviando encuesta...',
      spinner: 'crescent',
    });
    await loading.present();

    this.enviando = true;

    try {
      await this.encuestaService.guardarRespuestas(
        this.clienteId,
        this.mesaId,
        this.respuestas
      );

      await loading.dismiss();
      this.enviando = false;
      this.yaRespondio = true;

      this.showToast(
        '¡Gracias por tu opinión! Tu encuesta ha sido enviada correctamente',
        'success'
      );
    } catch (error) {
      await loading.dismiss();
      this.enviando = false;
      console.error('Error enviando encuesta:', error);
      this.showToast('Error al enviar la encuesta. Intenta nuevamente', 'danger');
    }
  }

  async verResultados() {
    this.router.navigate(['/tabs-cliente-registrado/tab7-resultados']);
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