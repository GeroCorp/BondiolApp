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
        <div class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            text-align: center;">
            <div class="logo" style="font-size: 60px;
                  margin-bottom: 10px;
                  color: white;">🍽️</div>
            <h1 style="color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 600;">RestoApp</h1>
        </div>
        <div style="padding: 40px 30px;">
            <div style="text-align: center;
                  font-size: 70px;
                  margin-bottom: 20px;">✅</div>
            <h2 style="color: #333;
                font-size: 24px;
                text-align: center;
                margin-bottom: 10px;">¡Reserva Confirmada!</h2>
            <p style="color: #666;
                text-align: center;
                margin-bottom: 30px;
                font-size: 16px;">Hola ${datos.nombre}, tu reserva ha sido aprobada exitosamente.</p>
            
            <div style="background: #f7f7f7;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 20px 0;">
                <div style="display: flex;
                      justify-content: space-between;
                      padding: 10px 0;
                      border-bottom: 1px solid #ddd;">
                    <span style="color: #888; font-size: 14px;">📅 Fecha</span>
                    <span style="color: #333; font-weight: bold; font-size: 16px;">${datos.fecha_reserva}</span>
                </div>
                <div style="display: flex;
                      justify-content: space-between;
                      padding: 10px 0;
                      border-bottom: 1px solid #ddd;">
                    <span style="color: #888; font-size: 14px;">🕐 Hora</span>
                    <span style="color: #333; font-weight: bold; font-size: 16px;">${datos.hora_reserva}</span>
                </div>
                <div style="display: flex;
                      justify-content: space-between;
                      padding: 10px 0;
                      border-bottom: 1px solid #ddd;">
                    <span style="color: #888; font-size: 14px;">🪑 Mesa</span>
                    <span style="color: #333; font-weight: bold; font-size: 16px;">Mesa ${datos.numero_mesa}</span>
                </div>
                <div style="display: flex;
                      justify-content: space-between;
                      padding: 10px 0;">
                    <span style="color: #888; font-size: 14px;">👥 Personas</span>
                    <span style="color: #333; font-weight: bold; font-size: 16px;">${datos.cantidad_personas}</span>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 20px;
                  border-radius: 8px;
                  text-align: center;
                  margin: 20px 0;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">
                    ⏰ Tienes ${datos.tiempo_tolerancia} desde la hora de tu reserva para presentarte
                </p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                <strong>Importante:</strong> Al llegar al restaurante, escanea el código QR de tu mesa 
                para activar tu reserva. Si no te presentas en el tiempo de tolerancia, 
                la mesa será liberada automáticamente.
            </p>
        </div>
        <div class="footer" style="background-color: #333;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;">
            <p style="font-weight: bold; margin: 5px 0;">¡Te esperamos!</p>
            <p style="margin: 5px 0;">RestoApp © 2025</p>
            <p style="font-size: 12px; opacity: 0.8; margin: 5px 0;">
                Este es un correo automático, por favor no responder.
            </p>
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
        <div class="header" style="background: linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%);
            padding: 40px 20px;
            text-align: center;">
            <div class="logo" style="font-size: 60px;
                  margin-bottom: 10px;
                  color: white;">🍽️</div>
            <h1 style="color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 600;">RestoApp</h1>
        </div>
        <div style="padding: 40px 30px;">
            <div style="text-align: center;
                  font-size: 70px;
                  margin-bottom: 20px;">❌</div>
            <h2 style="color: #333;
                font-size: 24px;
                text-align: center;
                margin-bottom: 10px;">Reserva No Aprobada</h2>
            <p style="color: #666;
                text-align: center;
                margin-bottom: 30px;
                font-size: 16px;">Hola ${datos.nombre}, lamentamos informarte que tu reserva no pudo ser aprobada.</p>
            
            <div style="background: #fff5f5;
                  border-left: 4px solid #fc5c7d;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 20px 0;">
                <p style="margin: 0; color: #333; font-weight: bold;">
                    Detalles de la reserva:
                </p>
                <p style="margin: 8px 0 0 0; color: #666;">
                    📅 ${datos.fecha_reserva} • 🕐 ${datos.hora_reserva} • 🪑 Mesa ${datos.numero_mesa}
                </p>
            </div>
            
            <div style="background: #f7f7f7;
                  border-radius: 8px;
                  padding: 15px;
                  margin: 20px 0;">
                <div style="color: #666;
                      font-size: 14px;
                      font-weight: bold;
                      margin-bottom: 8px;">💬 Motivo del rechazo:</div>
                <p style="color: #333;
                    font-size: 16px;
                    line-height: 1.5;
                    margin: 0;">${datos.motivo_rechazo}</p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
                Te invitamos a realizar una nueva reserva con otras fechas y horarios disponibles.
            </p>
        </div>
        <div class="footer" style="background-color: #333;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;">
            <p style="font-weight: bold; margin: 5px 0;">Esperamos verte pronto</p>
            <p style="margin: 5px 0;">RestoApp © 2025</p>
            <p style="font-size: 12px; opacity: 0.8; margin: 5px 0;">
                Este es un correo automático, por favor no responder.
            </p>
        </div>
    </div>
</body>
`;

// Export por defecto
export default {
  reservaAprobada: reservaAprobadaTemplate,
  reservaRechazada: reservaRechazadaTemplate
};