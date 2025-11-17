import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { supabase } from './supabase';
import EmailTemplates from '../../assets/email-templates/index';
import { 
  reservaAprobadaTemplate, 
  reservaRechazadaTemplate, 
  ReservaAprobadaData, 
  ReservaRechazadaData 
} from '../../assets/email-templates/reservas';

interface Cliente {
  nombre: string;
  apellido: string;
  email: string;
  dni?: number | string;
}

interface DetallesPedido {
  id: number;
  nombre_prod: string;
  cantidad: number;
  precio_unitario: number;
}

export interface DatosFactura {
  pedidoId: number;
  SUBTOTAL: number;
  cliente_nombre: string;
  cliente_dni: string | number;
  items_facturados: DetallesPedido[];
  DESCUENTO_APLICADO: number;
  PORCENTAJE_PROPINA: number;
  IMPORTE_PROPINA: number;
}

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  supabaseClient = supabase;

  constructor() {}

  async enviarMailSupabase(datos: any) {
    const bodyData = JSON.stringify(datos);
    console.log('Datos pasados al body: ', datos);
    const { data: response, error } =
      await this.supabaseClient.functions.invoke('testeoperreo', {
        method: 'POST',
        body: bodyData, // Contiene nombre_cliente, email_cliente, html (template) y subject
        headers: {},
      });
    if (error)
      throw new Error(`Error enviando email via Supabase: ${error.message}`);

    console.log('Respuesta del envío: ', response);

    return response;
  }

  /**
   * Envía email de aprobación al cliente usando Supabase con template HTML
   */
  async enviarEmailAprobacionConTemplate(cliente: Cliente): Promise<boolean> {
    try {
      console.log(
        '📧 Enviando email de aprobación con template HTML a:',
        cliente.email
      );

      const htmlTemplate = EmailTemplates.aprobado(
        cliente.email,
        cliente.nombre
      );

      const datos = {
        nombre_cliente: cliente.nombre,
        email_cliente: cliente.email,
        html: htmlTemplate,
        subject: '¡Tu cuenta ha sido aprobada!',
      };

      await this.enviarMailSupabase(datos);
      console.log('✅ Email de aprobación con template enviado');
      return true;
    } catch (error: any) {
      console.error(
        '❌ Error al enviar email de aprobación con template:',
        error
      );
      return false;
    }
  }

  /**
   * Envía email de rechazo al cliente usando Supabase con template HTML
   */
  async enviarEmailRechazoConTemplate(cliente: Cliente): Promise<boolean> {
    try {
      console.log(
        '📧 Enviando email de rechazo con template HTML a:',
        cliente.email
      );

      const htmlTemplate = EmailTemplates.rechazado(cliente.nombre);

      const datos = {
        nombre_cliente: cliente.nombre + ' ' + cliente.apellido,
        email_cliente: cliente.email,
        html: htmlTemplate,
        subject: 'Notificación sobre su cuenta',
      };

      await this.enviarMailSupabase(datos);
      console.log('✅ Email de rechazo con template enviado');
      return true;
    } catch (error: any) {
      console.error('❌ Error al enviar email de rechazo con template:', error);
      return false;
    }
  }

  /**
   * Genera un PDF de la factura usando los datos proporcionados
   * @param datosFactura Datos para generar la factura (pedidoId, IMPORTE_TOTAL, cliente_nombre, cliente_dni, items_facturados, DESCUENTO_APLICADO, PORCENTAJE_PROPINA, IMPORTE_PROPINA)
   * @returns Objeto con el enlace de descarga del PDF generado o null si hay error
   */
  async generarPDF(datosFactura: any): Promise<any> {
    const bodyData = JSON.stringify(datosFactura);
    console.log('Datos pasados al body para PDF: ', datosFactura);

    try {
      const { data: response } = await this.supabaseClient.functions.invoke(
        'pdfConverter',
        {
          method: 'POST',
          body: JSON.stringify(datosFactura),
          headers: {},
        }
      );

      const returnRes =
        typeof response === 'string' ? JSON.parse(response) : response;

      return returnRes;
    } catch (error) {
      console.error('❌ Error generando PDF de factura via Supabase:', error);
      return null;
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
      const datosFactura: DatosFactura = {
        pedidoId: pedidoId,
        SUBTOTAL: montoTotal,
        cliente_nombre: cliente.nombre,
        cliente_dni: cliente.dni || 0,
        items_facturados: pedidoDetalles,
        DESCUENTO_APLICADO: descuentoAplicado ? descuentoAplicado : 0,
        PORCENTAJE_PROPINA: porcentajePropina ? porcentajePropina : 0,
        IMPORTE_PROPINA: montoTotal * (porcentajePropina / 100),
      };

      const parsedData = await this.generarPDF(datosFactura);
      console.log('downloadLink:', parsedData?.downloadLink);

      const htmlTemplate = EmailTemplates.mailFactura(
        cliente.nombre,
        montoTotal,
        pedidoId,
        parsedData?.downloadLink,
        new Date().toLocaleString()
      );

      const datos = {
        email_cliente: cliente.email,
        html: htmlTemplate,
        subject: `Factura de su pedido #${pedidoId}`,
      };

      const mailEnviado = await this.enviarMailSupabase(datos);
      console.log('✅ Email de factura enviado: ', mailEnviado);

      return true;
       
     }catch(err){
       console.error('❌ Error al enviar email de factura con template:', err);
       return false;
     }
   }

   async enviarEmailReservaAprobada(
    cliente: { nombre: string; apellido: string; email: string },
    datosReserva: { fecha: string; hora: string; mesa: number; personas: number },
    tiempoTolerancia: string = '45 minutos'
  ): Promise<boolean> {
    try {
      console.log('📧 Enviando email de reserva aprobada a:', cliente.email);
      
      // Formatear fecha de YYYY-MM-DD a DD/MM/YYYY
      const [year, month, day] = datosReserva.fecha.split('-');
      const fechaFormateada = `${day}/${month}/${year}`;
      
      // Formatear hora de HH:MM:SS a HH:MM
      const horaFormateada = datosReserva.hora.substring(0, 5);
      
      const datosTemplate: ReservaAprobadaData = {
        nombre: `${cliente.nombre} ${cliente.apellido}`,
        fecha_reserva: fechaFormateada,
        hora_reserva: horaFormateada,
        numero_mesa: datosReserva.mesa,
        cantidad_personas: datosReserva.personas,
        tiempo_tolerancia: tiempoTolerancia
      };
      
      const htmlTemplate = reservaAprobadaTemplate(datosTemplate);
      
      const datos = {
        nombre_cliente: `${cliente.nombre} ${cliente.apellido}`,
        email_cliente: cliente.email,
        html: htmlTemplate,
        subject: '✅ Reserva Confirmada - RestoApp'
      };

      await this.enviarMailSupabase(datos);
      console.log('✅ Email de reserva aprobada enviado');
      return true;
    } catch (error: any) {
      console.error('❌ Error al enviar email de reserva aprobada:', error);
      return false;
    }
  }

  /**
   * Envía email de reserva rechazada al cliente
   * @param cliente - Datos del cliente (nombre, apellido, email)
   * @param datosReserva - Información de la reserva (fecha, hora, mesa, personas)
   * @param motivoRechazo - Razón del rechazo de la reserva
   */
  async enviarEmailReservaRechazada(
    cliente: { nombre: string; apellido: string; email: string },
    datosReserva: { fecha: string; hora: string; mesa: number; personas: number },
    motivoRechazo: string
  ): Promise<boolean> {
    try {
      console.log('📧 Enviando email de reserva rechazada a:', cliente.email);
      
      // Formatear fecha de YYYY-MM-DD a DD/MM/YYYY
      const [year, month, day] = datosReserva.fecha.split('-');
      const fechaFormateada = `${day}/${month}/${year}`;
      
      // Formatear hora de HH:MM:SS a HH:MM
      const horaFormateada = datosReserva.hora.substring(0, 5);
      
      const datosTemplate: ReservaRechazadaData = {
        nombre: `${cliente.nombre} ${cliente.apellido}`,
        fecha_reserva: fechaFormateada,
        hora_reserva: horaFormateada,
        numero_mesa: datosReserva.mesa,
        motivo_rechazo: motivoRechazo
      };
      
      const htmlTemplate = reservaRechazadaTemplate(datosTemplate);
      
      const datos = {
        nombre_cliente: `${cliente.nombre} ${cliente.apellido}`,
        email_cliente: cliente.email,
        html: htmlTemplate,
        subject: '❌ Reserva No Aprobada - RestoApp'
      };

      await this.enviarMailSupabase(datos);
      console.log('✅ Email de reserva rechazada enviado');
      return true;
    } catch (error: any) {
      console.error('❌ Error al enviar email de reserva rechazada:', error);
      return false;
    }
  }
}
