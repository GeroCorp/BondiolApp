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
}
