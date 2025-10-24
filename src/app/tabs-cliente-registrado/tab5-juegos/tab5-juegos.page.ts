import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClienteService } from 'src/app/services/cliente.service';
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
  juegoActivo: 'memoria' | 'adivinanza' | 'ruleta' | null = null;

  constructor(
    private router: Router,
    private clienteService: ClienteService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.cargarEstadoJuegos();
  }

  async cargarEstadoJuegos() {
    try {
      const clienteId = await this.clienteService.getClientId();
      const mesaId = await this.clienteService.getNroMesa(clienteId);
      
      const estado = await this.clienteService.getEstadoJuegos(mesaId, clienteId);
      
      if (estado) {
        this.descuentoObtenido = estado.descuento_obtenido || 0;
        this.primerIntentoUsado = estado.primer_intento_usado || false;
      }
    } catch (error) {
      console.error('Error cargando estado de juegos:', error);
    }
  }

  seleccionarJuego(juego: 'memoria' | 'adivinanza' | 'ruleta') {
    if (this.primerIntentoUsado && this.descuentoObtenido === 0) {
      this.showToast('Ya usaste tu primer intento. Puedes seguir jugando libremente pero no obtendrás descuentos.', 'warning');
    }
    this.juegoActivo = juego;
  }

  async onJuegoTerminado(evento: { gano: boolean; descuento: number; primerIntento: boolean }) {
    console.log('Juego terminado:', evento);

    if (evento.primerIntento && evento.gano && this.descuentoObtenido === 0) {
      this.descuentoObtenido = evento.descuento;
      this.primerIntentoUsado = true;
      
      await this.guardarDescuento(evento.descuento);
      
      const alert = await this.alertController.create({
        header: '¡Felicitaciones! 🎉',
        message: `Has ganado un descuento del ${evento.descuento}% en tu cuenta final.`,
        buttons: ['¡Genial!']
      });
      await alert.present();
    } else if (evento.primerIntento && !evento.gano) {
      this.primerIntentoUsado = true;
      await this.marcarPrimerIntentoUsado();
      
      this.showToast('No ganaste en el primer intento. Puedes seguir jugando libremente.', 'medium');
    } else if (!evento.primerIntento && evento.gano) {
      this.showToast('¡Ganaste! Pero el descuento solo se aplica en el primer intento.', 'success');
    }

    setTimeout(() => {
      this.juegoActivo = null;
    }, 2000);
  }

  async guardarDescuento(descuento: number) {
    try {
      const clienteId = await this.clienteService.getClientId();
      const mesaId = await this.clienteService.getNroMesa(clienteId);
      
      await this.clienteService.guardarDescuentoJuego(mesaId, clienteId, descuento);
      
      console.log('Descuento guardado:', descuento);
    } catch (error) {
      console.error('Error guardando descuento:', error);
    }
  }

  async marcarPrimerIntentoUsado() {
    try {
      const clienteId = await this.clienteService.getClientId();
      const mesaId = await this.clienteService.getNroMesa(clienteId);
      
      await this.clienteService.marcarPrimerIntentoUsado(mesaId, clienteId);
    } catch (error) {
      console.error('Error marcando primer intento:', error);
    }
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