import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { environment } from 'src/environments/environment';
import { supabase } from './supabase';
import EmailTemplates from '../../assets/email-templates/index';

interface Cliente {
  nombre: string;
  apellido: string;
  email: string;
  dni?: number | string;
}

interface DetallesPedido {
  id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  supabaseClient = supabase;

  constructor(
  ) {
    // Inicializar EmailJS con tu Public Key
    emailjs.init(environment.emailjs.publicKey);
    console.log('✅ EmailJS inicializado con Public Key:', environment.emailjs.publicKey);
  }

  async enviarMailSupabase(datos: any){
    const bodyData = JSON.stringify(datos);
    console.log("Datos pasados al body: ", datos);
    const {data: response, error} = await this.supabaseClient.functions.invoke('mailSender', {
      method: 'POST',
      body: bodyData, // Contiene nombre_cliente, email_cliente, numero_pedido, monto_total, html (template)
      headers: {
      }
    })
    if (error) throw new Error(`Error enviando email via Supabase: ${error.message}`);

    console.log("Respuesta del envío: ", response);

    return response;
  }

  /**
   * Envía email de aprobación al cliente usando Supabase con template HTML
   */
  async enviarEmailAprobacionConTemplate(cliente: Cliente): Promise<boolean> {
    try {
      console.log('📧 Enviando email de aprobación con template HTML a:', cliente.email);
      
      const htmlTemplate = EmailTemplates.aprobado(cliente.email, cliente.nombre);
      
      const datos = {
        nombre_cliente: cliente.nombre,
        email_cliente: cliente.email,
        html: htmlTemplate,
        subject: '¡Tu cuenta ha sido aprobada!'
      };

      await this.enviarMailSupabase(datos);
      console.log('✅ Email de aprobación con template enviado');
      return true;
    } catch (error: any) {
      console.error('❌ Error al enviar email de aprobación con template:', error);
      return false;
    }
  }

  /**
   * Envía email de rechazo al cliente usando Supabase con template HTML
   */
  async enviarEmailRechazoConTemplate(cliente: Cliente): Promise<boolean> {
    try {
      console.log('📧 Enviando email de rechazo con template HTML a:', cliente.email);
      
      const htmlTemplate = EmailTemplates.rechazado(cliente.nombre);
      
      const datos = {
        nombre_cliente: cliente.nombre + " " + cliente.apellido,
        email_cliente: cliente.email,
        html: htmlTemplate,
        subject: 'Notificación sobre su cuenta'
      };

      await this.enviarMailSupabase(datos);
      console.log('✅ Email de rechazo con template enviado');
      return true;
    } catch (error: any) {
      console.error('❌ Error al enviar email de rechazo con template:', error);
      return false;
    }
  }

  async enviarEmailFactura(
    pedidoId: number, 
    montoTotal: number, 
    cliente: Cliente,
    porcentajePropina: number,
    descuentoAplicado: number,
    pedidoDetalles: DetallesPedido[]
  ): Promise<boolean> {
    try {

      const { data: response, error } = await this.supabaseClient.functions.invoke('pdfConverter', {
        method: 'POST',
        body: JSON.stringify({
          pedidoId: pedidoId,
          IMPORTE_TOTAL: montoTotal,
          cliente_nombre: cliente.nombre,
          cliente_dni: cliente.dni,
          items_facturados: pedidoDetalles,
          DESCUENTO_APLICADO: descuentoAplicado,
          PORCENTAJE_PROPINA: porcentajePropina,
          IMPORTE_PROPINA: montoTotal * (porcentajePropina / 100)
        }),
        headers: {

        }
        
      })

      if (error) throw new Error(`Error generando PDF de factura: ${error.message}`);

      const pdfData = response as { downloadLink: string };
      console.log(pdfData);

      const htmlTemplate = EmailTemplates.mailFactura(cliente.nombre, montoTotal, pedidoId, pdfData.downloadLink, Date.now().toLocaleString());

      return true;

       const datos = {
         nombre_cliente: cliente.nombre,
         email_cliente: cliente.email,
         html: htmlTemplate
       };

       await this.enviarMailSupabase(datos);
       console.log('✅ Email de factura enviado');
       return true;
       
     }catch(err){
       console.error('❌ Error al enviar email de factura con template:', err);
       return false;
     }
   }

}
