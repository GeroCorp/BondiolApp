import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { environment } from 'src/environments/environment';

interface Cliente {
  nombre: string;
  apellido: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  constructor() {
    // Inicializar EmailJS con tu Public Key
    emailjs.init(environment.emailjs.publicKey);
    console.log('✅ EmailJS inicializado con Public Key:', environment.emailjs.publicKey);
  }

  /**
   * Envía email de aprobación al cliente
   */
  async enviarEmailAprobacion(cliente: Cliente): Promise<boolean> {
    try {
      console.log('📧 Intentando enviar email de aprobación a:', cliente.email);
      
      const templateParams = {
        nombre: cliente.nombre,
        email: cliente.email,
        to_email: cliente.email
      };

      console.log('📧 Template params:', templateParams);

      const response = await emailjs.send(
        environment.emailjs.serviceId,
        environment.emailjs.templates.aprobado,
        templateParams
      );

      console.log('✅ Email de aprobación enviado:', response);
      return response.status === 200;
    } catch (error: any) {
      console.error('❌ Error al enviar email de aprobación:', error);
      console.error('❌ Detalles del error:', {
        text: error.text,
        status: error.status,
        message: error.message
      });
      return false;
    }
  }

  /**
   * Envía email de rechazo al cliente
   */
  async enviarEmailRechazo(cliente: Cliente): Promise<boolean> {
    try {
      console.log('📧 Intentando enviar email de rechazo a:', cliente.email);
      
      const templateParams = {
        nombre: cliente.nombre,
        email: cliente.email,
        to_email: cliente.email
      };

      console.log('📧 Template params:', templateParams);

      const response = await emailjs.send(
        environment.emailjs.serviceId,
        environment.emailjs.templates.rechazado,
        templateParams
      );

      console.log('✅ Email de rechazo enviado:', response);
      return response.status === 200;
    } catch (error: any) {
      console.error('❌ Error al enviar email de rechazo:', error);
      console.error('❌ Detalles del error:', {
        text: error.text,
        status: error.status,
        message: error.message
      });
      return false;
    }
  }

  /**
   * 📧 NUEVO: Enviar email de aprobación de reserva
   */
  async enviarEmailAprobacionReserva(
    cliente: Cliente,
    reserva: {
      fecha: string;
      hora: string;
      mesa: number;
      personas: number;
    }
  ): Promise<boolean> {
    try {
      console.log('📧 Enviando email de aprobación de reserva a:', cliente.email);
      
      // Formatear fecha
      const fechaFormateada = this.formatearFecha(reserva.fecha);
      
      const templateParams = {
        to_email: cliente.email,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        fecha_reserva: fechaFormateada,
        hora_reserva: reserva.hora,
        numero_mesa: reserva.mesa,
        cantidad_personas: reserva.personas,
        tiempo_tolerancia: '45 minutos'
      };

      console.log('📧 Template params reserva aprobada:', templateParams);

      const response = await emailjs.send(
        environment.emailjs.serviceId,
        'template_reserva_aprobada', // ⚠️ Debe existir en EmailJS
        templateParams
      );

      console.log('✅ Email de aprobación de reserva enviado:', response);
      return response.status === 200;
    } catch (error: any) {
      console.error('❌ Error al enviar email de aprobación de reserva:', error);
      console.error('❌ Detalles del error:', {
        text: error.text,
        status: error.status,
        message: error.message
      });
      return false;
    }
  }

  /**
   * 📧 NUEVO: Enviar email de rechazo de reserva
   */
  async enviarEmailRechazoReserva(
    cliente: Cliente,
    reserva: {
      fecha: string;
      hora: string;
      mesa: number;
      personas: number;
    },
    motivo: string
  ): Promise<boolean> {
    try {
      console.log('📧 Enviando email de rechazo de reserva a:', cliente.email);
      
      // Formatear fecha
      const fechaFormateada = this.formatearFecha(reserva.fecha);
      
      const templateParams = {
        to_email: cliente.email,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        fecha_reserva: fechaFormateada,
        hora_reserva: reserva.hora,
        numero_mesa: reserva.mesa,
        cantidad_personas: reserva.personas,
        motivo_rechazo: motivo
      };

      console.log('📧 Template params reserva rechazada:', templateParams);

      const response = await emailjs.send(
        environment.emailjs.serviceId,
        'template_reserva_rechazada', // ⚠️ Debe existir en EmailJS
        templateParams
      );

      console.log('✅ Email de rechazo de reserva enviado:', response);
      return response.status === 200;
    } catch (error: any) {
      console.error('❌ Error al enviar email de rechazo de reserva:', error);
      console.error('❌ Detalles del error:', {
        text: error.text,
        status: error.status,
        message: error.message
      });
      return false;
    }
  }

  /**
   * Formatear fecha para email
   */
  private formatearFecha(fecha: string): string {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}