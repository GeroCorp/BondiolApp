import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { EncuestaService } from 'src/app/services/encuesta.service';
import { HapticService } from 'src/app/services/haptic.service';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';

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
  public mesaId: number | null = 0;
  

  constructor(
    private router: Router,
    private clienteService: ClienteService,
    private encuestaService: EncuestaService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private hapticService: HapticService,
    private alertController: AlertController,
    private tipoClienteService: TipoClienteService
  ) {}

  async ngOnInit() {
  try {
    // ✅ VERIFICAR SI YA RESPONDIÓ
    const isAnonimo = this.tipoClienteService.isAnonimo();
    const clienteData = this.tipoClienteService.getClienteData();
    
    let clienteId: number | null = null;
    let mesaId: number | null = null;

    if (isAnonimo) {
      mesaId = clienteData?.mesa_asignada || null;
      clienteId = null;
    } else {
      clienteId = await this.clienteService.getClientId();
      mesaId = await this.clienteService.getMesaID(clienteId);
    }

    if (!mesaId) {
      console.warn('⚠️ Sin mesa asignada');
      return;
    }

    // ✅ VERIFICAR CON EL PARÁMETRO esAnonimo
    const yaRespondio = await this.encuestaService.yaRespondiEncuesta(
      clienteId,
      mesaId,
      isAnonimo  // ✅ PARÁMETRO FALTANTE
    );

    if (yaRespondio) {
      const alert = await this.alertController.create({
        header: 'Encuesta ya completada',
        message: 'Ya has respondido la encuesta para esta mesa',
        buttons: [
          {
            text: 'Ver resultados',
            handler: () => {
              this.router.navigate(['/tabs-cliente-registrado/tab7-resultados']);
            }
          },
          {
            text: 'Volver',
            handler: () => {
              this.router.navigate(['/home-cliente']);
            }
          }
        ],
        backdropDismiss: false
      });
      
      await alert.present();
    }
    
  } catch (error) {
    console.error('❌ Error verificando encuesta:', error);
  }
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
  if (this.formularioCompleto()) {
    const loading = await this.loadingController.create({
      message: 'Enviando encuesta...',
      spinner: 'crescent',
    });
    await loading.present();

    try {
      // ✅ OBTENER DATOS DEL CLIENTE
      const isAnonimo = this.tipoClienteService.isAnonimo();
      const clienteData = this.tipoClienteService.getClienteData();
      
      let clienteId: number | null = null;
      let mesaId: number | null = null;

      if (isAnonimo) {
        // ✅ ANÓNIMO
        mesaId = clienteData?.mesa_asignada || null;
        clienteId = null;
        
        console.log('🎭 Enviando encuesta de anónimo:', {
          mesaId,
          nombre: clienteData?.nombre
        });
      } else {
        // ✅ REGISTRADO
        clienteId = await this.clienteService.getClientId();
        mesaId = await this.clienteService.getMesaID(clienteId);
        
        console.log('👤 Enviando encuesta de registrado:', {
          clienteId,
          mesaId
        });
      }

      if (!mesaId) {
        throw new Error('No se pudo obtener la mesa asignada');
      }

      // ✅ CRÍTICO: Pasar el parámetro esAnonimo
      await this.encuestaService.guardarRespuestas(
        clienteId,
        mesaId,
        this.respuestas,
        isAnonimo  // ✅ PARÁMETRO FALTANTE
      );

      await loading.dismiss();
      
      await this.hapticService.vibrateSuccess();
      
      const alert = await this.alertController.create({
        header: '✅ ¡Gracias!',
        message: 'Tu opinión es muy importante para nosotros',
        buttons: [
          {
            text: 'Aceptar',
            handler: () => {
              this.router.navigate(['/home-cliente']);
            }
          }
        ]
      });
      
      await alert.present();
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error enviando encuesta:', error);
      await this.hapticService.vibrateError();
      
      this.showToast(
        error.message || 'Error al enviar la encuesta',
        'danger'
      );
    }
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