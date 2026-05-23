import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClienteService } from 'src/app/services/cliente.service';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab5-juegos',
  templateUrl: './tab5-juegos.page.html',
  styleUrls: ['./tab5-juegos.page.scss'],
  standalone: false,
})
export class Tab5JuegosPage implements OnInit {
  descuentoObtenido: number = 0;
  primerIntentoUsado: boolean = false;
  juegoActivo: 'memoria' | 'adivinanza' | 'ruleta' | 'mozo' | null = null;
  isAnonimo: boolean = false;
  modalReglasAbierto: boolean = false;

  constructor(
    private router: Router,
    private clienteService: ClienteService,
    private tipoClienteService: TipoClienteService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    this.isAnonimo = this.tipoClienteService.isAnonimo();
    await this.cargarEstadoJuegos();
  }

  async cargarEstadoJuegos() {
    try {
      const clienteId = await this.clienteService.getClientId();
      const mesaId = await this.clienteService.getMesaID(clienteId);
      
      const estado = await this.clienteService.getEstadoJuegos(mesaId, clienteId);
      
      if (estado) {
        this.descuentoObtenido = estado.descuento_obtenido || 0;
        this.primerIntentoUsado = estado.primer_intento_usado || false;
      }
    } catch (error) {
      console.error('Error cargando estado de juegos:', error);
    }
  }

  seleccionarJuego(juego: 'memoria' | 'adivinanza' | 'ruleta' | 'mozo') {
  if (this.isAnonimo) {
    this.showToast('Estás en modo invitado. Puedes jugar pero no obtendrás descuentos.', 'warning');
  } else if (this.primerIntentoUsado && this.descuentoObtenido === 0) {
    this.showToast('Ya usaste tu primer intento. Puedes seguir jugando libremente pero no obtendrás descuentos.', 'warning');
  }
  console.log("Entrnado al juego...");
  this.juegoActivo = juego;
}

  async onJuegoTerminado(evento: { gano: boolean; descuento: number; primerIntento: boolean }) {
    console.log('Juego terminado:', evento);

    if (this.isAnonimo) {
      if (evento.gano) {
        this.showToast('¡Ganaste! Pero los descuentos solo están disponibles para clientes registrados.', 'warning');
      }
      if (evento.primerIntento) {
        this.primerIntentoUsado = true;
      }
      this.juegoActivo = null;
      return;
    }

    if (evento.primerIntento && evento.gano && this.descuentoObtenido === 0) {
      this.descuentoObtenido = evento.descuento;
      this.primerIntentoUsado = true;
      
      await this.guardarDescuento(evento.descuento);
      
      const alert = await this.alertController.create({
        header: '¡Felicitaciones! 🎉',
        message: `Has ganado un descuento del ${evento.descuento}% en tu cuenta final.`,
        buttons: [
          {
            text: '¡Genial!',
            handler: () => {
              this.juegoActivo = null; // Solo cerrar cuando se presiona el botón
            }
          }
        ]
      });
      await alert.present();
    } else if (evento.primerIntento && !evento.gano) {
      this.primerIntentoUsado = true;
      await this.marcarPrimerIntentoUsado();
      
      this.showToast('No ganaste en el primer intento. Puedes seguir jugando libremente.', 'medium');
    } else if (!evento.primerIntento && evento.gano) {
      this.showToast('¡Ganaste! Pero el descuento solo se aplica en el primer intento.', 'success');
    }

    // Se eliminó el cierre automático del juego 
  }

  async guardarDescuento(descuento: number) {
    try {
      const clienteId = await this.clienteService.getClientId();
      const mesaId = await this.clienteService.getMesaID(clienteId);
      
      await this.clienteService.guardarDescuentoJuego(mesaId, clienteId, descuento);
      
      console.log('Descuento guardado:', descuento);
    } catch (error) {
      console.error('Error guardando descuento:', error);
    }
  }

  async marcarPrimerIntentoUsado() {
    try {
      const clienteId = await this.clienteService.getClientId();
      const mesaId = await this.clienteService.getMesaID(clienteId);
      
      await this.clienteService.marcarPrimerIntentoUsado(mesaId, clienteId);
    } catch (error) {
      console.error('Error marcando primer intento:', error);
    }
  }

  abrirReglas() {
    this.modalReglasAbierto = true;
  }

  cerrarReglas() {
    this.modalReglasAbierto = false;
  }

  volverHome() {
    this.router.navigate(['/home-cliente']);
  }

  cerrarJuego() {
    this.juegoActivo = null;
  }

  async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning' = 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}