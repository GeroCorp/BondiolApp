/**
 * Templates de email para reservas en RestoApp
 */

export interface ReservaAprobadaData {
  nombre: string;
  fecha_reserva: string;
  hora_reserva: string;
  numero_mesa: number;
  cantidad_personas: number;
  tiempo_tolerancia: string;
}

export interface ReservaRechazadaData {
  nombre: string;
  fecha_reserva: string;
  hora_reserva: string;
  numero_mesa: number;
  motivo_rechazo: string;
}

/**
 * Template para email de reserva aprobada
 */
export const reservaAprobadaTemplate = (datos: ReservaAprobadaData) => `
<body style="margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;">
    <div class="container" style="max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div class="header" style="background: linear-gradient(135deg, #ff2525 0%, #ff5555 100%);
            padding: 40px 20px;
            text-align: center;">
            <div class="logo" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                  padding: 20px;
                  width: fit-content;
                  background-color: rgb(255,20,50);
                  border-radius: 50%;
                  margin: 0 auto 20px;">
                <img src="http://cdn.mcauto-images-production.sendgrid.net/7ffb83c7fa07769b/86a3281b-558f-4c20-a09d-6ca185860aad/1024x1024.png" 
                     alt="RestoApp Logo" 
                     height="80px" 
                     width="80px">
            </div>
            <h1 style="color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 600;">RestoApp</h1>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">¡Hola ${datos.nombre}!</h2>
            <div class="badge" style="display: inline-block;
                    background-color: #4CAF50;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 25px;
                    font-weight: bold;
                    margin: 20px 0;">✅ RESERVA CONFIRMADA</div>
            <div style="color: #666;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 15px;">
                <p>Nos complace informarte que tu <strong>reserva ha sido aprobada exitosamente</strong>.</p>
                
                <div style="background-color: #f9f9f9;
                      border-left: 4px solid #4CAF50;
                      padding: 15px;
                      margin: 20px 0;
                      border-radius: 5px;">
                    <p style="margin: 5px 0; color: #333;">
                        <strong>📅 Fecha:</strong> ${datos.fecha_reserva}
                    </p>
                    <p style="margin: 5px 0; color: #333;">
                        <strong>🕐 Hora:</strong> ${datos.hora_reserva}
                    </p>
                    <p style="margin: 5px 0; color: #333;">
                        <strong>🪑 Mesa:</strong> Mesa ${datos.numero_mesa}
                    </p>
                    <p style="margin: 5px 0; color: #333;">
                        <strong>👥 Personas:</strong> ${datos.cantidad_personas}
                    </p>
                </div>

                <div style="background-color: #fff3cd;
                      border-left: 4px solid #ffc107;
                      padding: 15px;
                      margin: 20px 0;
                      border-radius: 5px;">
                    <p style="margin: 0; color: #856404;">
                        <strong>⏰ Importante:</strong> Tienes <strong>${datos.tiempo_tolerancia}</strong> desde la hora de tu reserva para presentarte y escanear el código QR de tu mesa.
                    </p>
                </div>

                <p><strong>¿Qué debes hacer?</strong></p>
                <ul style="color: #666; line-height: 1.8;">
                    <li>Llega al restaurante en el horario indicado</li>
                    <li>Escanea el código QR de tu mesa</li>
                    <li>Activa tu reserva y disfruta</li>
                </ul>
            </div>
        </div>
        <div class="footer" style="background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 14px;">
            <p>Este es un correo automático, por favor no respondas.</p>
            <p>&copy; 2025 RestoApp. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
`;

/**
 * Template para email de reserva rechazada
 */
export const reservaRechazadaTemplate = (datos: ReservaRechazadaData) => `
<body style="margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;">
    <div class="container" style="max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div class="header" style="background: linear-gradient(135deg, #ff2525 0%, #ff5555 100%);
            padding: 40px 20px;
            text-align: center;">
            <div class="logo" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                  padding: 20px;
                  width: fit-content;
                  background-color: rgb(255,20,50);
                  border-radius: 50%;
                  margin: 0 auto 20px;">
                <img src="http://cdn.mcauto-images-production.sendgrid.net/7ffb83c7fa07769b/86a3281b-558f-4c20-a09d-6ca185860aad/1024x1024.png" 
                     alt="RestoApp Logo" 
                     height="80px" 
                     width="80px">
            </div>
            <h1 style="color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 600;">RestoApp</h1>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">Hola ${datos.nombre},</h2>
            <div class="badge" style="display: inline-block;
                    background-color: #f44336;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 25px;
                    font-weight: bold;
                    margin: 20px 0;">❌ RESERVA NO APROBADA</div>
            <div style="color: #666;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 15px;">
                <p>Lamentamos informarte que tu solicitud de reserva en <strong>RestoApp</strong> no ha sido aprobada en este momento.</p>
                
                <div style="background-color: #f9f9f9;
                      border-left: 4px solid #f44336;
                      padding: 15px;
                      margin: 20px 0;
                      border-radius: 5px;">
                    <p style="margin: 5px 0; color: #333;">
                        <strong>📅 Fecha solicitada:</strong> ${datos.fecha_reserva}
                    </p>
                    <p style="margin: 5px 0; color: #333;">
                        <strong>🕐 Hora solicitada:</strong> ${datos.hora_reserva}
                    </p>
                    <p style="margin: 5px 0; color: #333;">
                        <strong>🪑 Mesa solicitada:</strong> Mesa ${datos.numero_mesa}
                    </p>
                </div>

                <div style="background-color: #fff3f3;
                      border-left: 4px solid #f44336;
                      padding: 15px;
                      margin: 20px 0;
                      border-radius: 5px;">
                    <p style="margin: 0; color: #721c24;">
                        <strong>📝 Motivo:</strong> ${datos.motivo_rechazo}
                    </p>
                </div>

                <p>Te invitamos a realizar una nueva reserva con otras fechas y horarios disponibles.</p>
                <p>Si crees que esto es un error o deseas más información, por favor contacta al administrador del restaurante.</p>
            </div>
        </div>
        <div class="footer" style="background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 14px;">
            <p>Este es un correo automático, por favor no respondas.</p>
            <p>&copy; 2025 RestoApp. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
`;

// Export por defecto
export default {
  reservaAprobada: reservaAprobadaTemplate,
  reservaRechazada: reservaRechazadaTemplate
};