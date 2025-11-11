import { Component, OnInit } from '@angular/core';
import { ReservasService } from '../../services/reservas.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-gestion-reservas',
  templateUrl: './gestion-reservas.page.html',
  styleUrls: ['./gestion-reservas.page.scss'],
  standalone: false
})
export class GestionReservasPage implements OnInit {
  
  reservasPendientes: any[] = [];
  reservasAprobadas: any[] = [];
  todasReservas: any[] = [];
  
  segmentoActual: string = 'pendientes';
  cargando: boolean = false;

  constructor(
    private reservasService: ReservasService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.cargarReservas();
    this.iniciarVerificacionAutomatica();
  }

  /**
   * Cargar todas las reservas
   */
  async cargarReservas() {
    try {
      this.cargando = true;

      // Cargar pendientes
      const resultadoPendientes = await this.reservasService.getReservasPendientes();
      if (resultadoPendientes.success) {
        this.reservasPendientes = resultadoPendientes.data;
      }

      // Cargar todas
      const resultadoTodas = await this.reservasService.getAllReservas();
      if (resultadoTodas.success) {
        this.todasReservas = resultadoTodas.data;
        this.reservasAprobadas = resultadoTodas.data.filter(r => 
          ['aprobada', 'activa'].includes(r.estado)
        );
      }

      console.log('✅ Reservas cargadas:', {
        pendientes: this.reservasPendientes.length,
        aprobadas: this.reservasAprobadas.length,
        total: this.todasReservas.length
      });

    } catch (error) {
      console.error('Error cargando reservas:', error);
      await this.showToast('Error al cargar reservas', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Cambiar segmento
   */
  segmentChanged(event: any) {
    this.segmentoActual = event.detail.value;
  }

  /**
   * PUNTO 25: Aprobar reserva
   */
  async aprobarReserva(reserva: any) {
    const htmlMessage = `
 
    ¿Confirmas aprobar esta reserva?
    Cliente: ${reserva.cliente.nombre} ${reserva.cliente.apellido}
    Email: ${reserva.cliente.email}
    Fecha: ${this.formatearFecha(reserva.fecha_reserva)}
    Hora: ${reserva.hora_reserva}
    Mesa: ${reserva.mesa.numero}
    Personas:${reserva.cantidad_personas}
   Se enviará un email de confirmación al cliente.
  `;

    const alert = await this.alertController.create({
      header: '✅ Aprobar Reserva',
      message: htmlMessage,
      cssClass: 'custom-html-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aprobar y Enviar Email',
          handler: async () => {
            await this.procesarAprobacion(reserva.id);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar aprobación de reserva
   */
  private async procesarAprobacion(reservaId: number) {
    try {
      this.cargando = true;

      const resultado = await this.reservasService.aprobarReserva(reservaId);

      if (resultado.success) {
        await this.showToast('✅ Reserva aprobada y email enviado', 'success');
        await this.cargarReservas();
      } else {
        await this.showToast(resultado.error || 'Error al aprobar', 'danger');
      }

    } catch (error) {
      console.error('Error aprobando reserva:', error);
      await this.showToast('Error al procesar aprobación', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * PUNTO 25: Rechazar reserva con motivo
   */
  async rechazarReserva(reserva: any) {
    const alert = await this.alertController.create({
      header: '❌ Rechazar Reserva',
      message: `
        Cliente: ${reserva.cliente.nombre} ${reserva.cliente.apellido}
        Email: ${reserva.cliente.email}
        Fecha: ${this.formatearFecha(reserva.fecha_reserva)} - ${reserva.hora_reserva}
        Por favor indica el motivo del rechazo:
      `,
      cssClass: 'custom-html-alert',
      inputs: [
        {
          name: 'motivo',
          type: 'textarea',
          placeholder: 'Escribe el motivo del rechazo... (será enviado por email)',
          attributes: {
            rows: 4,
            maxlength: 500
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Rechazar y Enviar Email',
          handler: async (data) => {
            if (!data.motivo || data.motivo.trim() === '') {
              await this.showToast('Debes indicar un motivo', 'warning');
              return false;
            }
            await this.procesarRechazo(reserva.id, data.motivo);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar rechazo de reserva
   */
  private async procesarRechazo(reservaId: number, motivo: string) {
    try {
      this.cargando = true;

      const resultado = await this.reservasService.rechazarReserva(reservaId, motivo);

      if (resultado.success) {
        await this.showToast('✅ Reserva rechazada y email enviado', 'success');
        await this.cargarReservas();
      } else {
        await this.showToast(resultado.error || 'Error al rechazar', 'danger');
      }

    } catch (error) {
      console.error('Error rechazando reserva:', error);
      await this.showToast('Error al procesar rechazo', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Ver detalles de una reserva
   */
  async verDetalles(reserva: any) {
    const htmlMessage = `
    📅 Fecha: ${this.formatearFecha(reserva.fecha_reserva)}
    🕐 Hora: ${reserva.hora_reserva}
    👤 Cliente: ${reserva.cliente.nombre} ${reserva.cliente.apellido}
    📧 Email: ${reserva.cliente.email}
    🆔 DNI: ${reserva.cliente.dni}
    🪑 Mesa: ${reserva.mesa.numero} (${reserva.mesa.tipo})
    👥 Personas: ${reserva.cantidad_personas}
    📊 Estado: ${this.getTextoEstado(reserva.estado)}
    ${reserva.motivo_rechazo ? '💬 Motivo rechazo: ' + reserva.motivo_rechazo : ''}
    ${reserva.hora_llegada ? '⏰ Hora llegada: ' + new Date(reserva.hora_llegada).toLocaleTimeString('es-AR') : ''}
    `;

    const alert = await this.alertController.create({
      header: '📋 Detalles de Reserva',
      message: htmlMessage,
      cssClass: 'custom-html-alert',
      buttons: ['Cerrar']
    });

    await alert.present();
  }

  async verificarReservasExpiradas() {
    try {
      this.cargando = true;

      const expiradas = await this.reservasService.verificarReservasExpiradas();

      if (expiradas > 0) {
        await this.showToast(`⏰ ${expiradas} reserva(s) expirada(s)`, 'warning');
        await this.cargarReservas();
      } else {
        await this.showToast('No hay reservas expiradas', 'medium');
      }

    } catch (error) {
      console.error('Error verificando expiradas:', error);
      await this.showToast('Error en verificación', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Iniciar verificación automática cada 5 minutos
   */
  private iniciarVerificacionAutomatica() {
    setInterval(async () => {
      console.log('🔄 Verificación automática de reservas expiradas...');
      await this.reservasService.verificarReservasExpiradas();
      await this.cargarReservas();
    }, 5 * 60 * 1000); // 5 minutos
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: string): string {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Obtener color según estado (Ionic)
   */
  getColorEstado(estado: string): string {
    const colores: any = {
      pendiente: 'warning',
      aprobada: 'success',
      rechazada: 'danger',
      activa: 'primary',
      completada: 'medium',
      expirada: 'medium'
    };
    return colores[estado] || 'medium';
  }

  /**
   * Obtener color según estado (HEX para HTML)
   */
  getColorEstadoHex(estado: string): string {
    const colores: any = {
      pendiente: '#ffc409',
      aprobada: '#2dd36f',
      rechazada: '#eb445a',
      activa: '#3880ff',
      completada: '#92949c',
      expirada: '#92949c'
    };
    return colores[estado] || '#92949c';
  }

  /**
   * Obtener texto del estado
   */
  getTextoEstado(estado: string): string {
    const textos: any = {
      pendiente: '⏳ Pendiente',
      aprobada: '✅ Aprobada',
      rechazada: '❌ Rechazada',
      activa: '🟢 Activa',
      completada: '✔️ Completada',
      expirada: '⏰ Expirada'
    };
    return textos[estado] || estado;
  }

  /**
   * Obtener ícono del estado
   */
  getIconoEstado(estado: string): string {
    const iconos: any = {
      pendiente: 'time-outline',
      aprobada: 'checkmark-circle-outline',
      rechazada: 'close-circle-outline',
      activa: 'restaurant-outline',
      completada: 'checkmark-done-outline',
      expirada: 'alarm-outline'
    };
    return iconos[estado] || 'help-outline';
  }

  /**
   * Refrescar datos
   */
  async refrescar(event: any) {
    await this.cargarReservas();
    event.target.complete();
  }

  /**
   * Mostrar toast
   */
  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}