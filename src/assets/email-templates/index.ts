/**
 * Templates de email para RestoApp
 * Archivo consolidado con todos los templates HTML
 */
export interface FacturaData {
    cliente_nombre: string, 
    cliente_apellido: string, 
    cliente_dni: number,
    fecha: string, 
    NUMERO_FACTURA: number, 
    pedidoId: number, 
    SUBTOTAL: number,
    DESCUENTO_APLICADO: number,
    PORCENTAJE_PROPINA: number,
    items_facturados: Array<{ id: number; nombre: string; cantidad: number; precio_unitario: number;}>,
    IMPORTE_PROPINA: number
}
export const EmailTemplates = {
  
  /**
   * Template para email de aprobación de registro
   */
  aprobado: (email: string, nombre: string) => `
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
                <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">¡Hola ${nombre}!</h2>
                <div class="badge" style="display: inline-block;
                        background-color: #4CAF50;
                        color: white;
                        padding: 10px 20px;
                        border-radius: 25px;
                        font-weight: bold;
                        margin: 20px 0;">✅ CUENTA APROBADA</div>
                <div style="color: #666;
                    font-size: 16px;
                    line-height: 1.6;
                    margin-bottom: 15px;">
                    <p>Nos complace informarte que tu registro en <strong>RestoApp</strong> ha sido <strong>aprobado exitosamente</strong>.</p>
                    <p>Ya puedes acceder a la aplicación con tu email: <strong>${email}</strong></p>
                    <p><strong>¿Qué puedes hacer ahora?</strong></p>
                    <ul style="color: #666; line-height: 1.8;">
                        <li>Ver el menú completo del restaurante</li>
                        <li>Hacer pedidos desde tu mesa</li>
                        <li>Consultar el estado de tus pedidos</li>
                        <li>Y mucho más...</li>
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
  `,

  /**
   * Template para email de rechazo de registro
   */
  rechazado: (nombre: string) => `
    <head>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #ff2525 0%, #ff5555 100%);
                padding: 40px 20px;
                text-align: center;
            }
            .logo {
                width: 120px;
                height: 120px;
                background-color: rgb(255,20,50);
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            .logo img {
                width: 80px;
                height: 80px;
            }
            .header h1 {
                color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }
            .content {
                padding: 40px 30px;
            }
            .content h2 {
                color: #333;
                font-size: 24px;
                margin-bottom: 20px;
            }
            .content p {
                color: #666;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 15px;
            }
            .badge {
                display: inline-block;
                background-color: #f44336;
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: bold;
                margin: 20px 0;
            }
            .footer {
                background-color: #f9f9f9;
                padding: 20px;
                text-align: center;
                color: #999;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">
                    <img src="http://cdn.mcauto-images-production.sendgrid.net/7ffb83c7fa07769b/86a3281b-558f-4c20-a09d-6ca185860aad/1024x1024.png" alt="RestoApp Logo">
                </div>
                <h1>RestoApp</h1>
            </div>
            <div class="content">
                <h2>Hola ${nombre},</h2>
                <div class="badge">❌ REGISTRO NO APROBADO</div>
                <p>Lamentamos informarte que tu solicitud de registro en <strong>RestoApp</strong> no ha sido aprobada en este momento.</p>
                <p><strong>Motivos posibles:</strong></p>
                <ul style="color: #666; line-height: 1.8;">
                    <li>Información incompleta o incorrecta</li>
                    <li>Foto de perfil no válida</li>
                    <li>DNI no coincidente</li>
                </ul>
                <p>Si crees que esto es un error o deseas más información, por favor contacta al administrador del restaurante.</p>
            </div>
            <div class="footer">
                <p>Este es un correo automático, por favor no respondas.</p>
                <p>&copy; 2025 RestoApp. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
  `,

  /**
   * Template entrega de factura
   */
  mailFactura: (nombre: string, monto: number, numero_pedido: number, link_factura_pdf: string, fecha: string ) => `
<head>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #ff2525 0%, #ff5555 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .logo {
          padding: 20px;
          width: fit-content;
          background-color: rgb(255,20,50);
          border-radius: 50%;
          margin: 0 auto 20px;
        }
        .logo img {
            width: 80px;
            height: 80px;
        }
        .header h1 {
            color: white;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #333;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .content p {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .badge {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #ff2525 0%, #ff4545 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            margin-top: 20px;
            box-shadow: 0 4px 8px rgba(255,37,37,0.3);
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                <img src="http://cdn.mcauto-images-production.sendgrid.net/7ffb83c7fa07769b/86a3281b-558f-4c20-a09d-6ca185860aad/1024x1024.png" alt="RestoApp Logo">
            </div>
            <h1>RestoApp</h1>
        </div>
        <div class="content">
            <h2>¡Hola ${nombre}!</h2>
            <div class="badge">✅ PAGO CONFIRMADO </div>
            <p>Nos complace informarte que hemos recibido el pago de tu pedido. ¡Gracias por usar RestoApp!</p>

            <p>Descargar tu factura en PDF aquí: <a href="${link_factura_pdf}" style="color: #FF4136; text-decoration: none;">[Descargar PDF]</a></p>
            <h2 style="font-size: 18px; margin-top: 25px; border-bottom: 1px solid #eeeeee; padding-bottom: 5px;">
        Resumen de la Factura
    </h2>

    <p style="font-size: 15px; margin: 5px 0;">
        Pedido Nro: ${numero_pedido}
    </p>
    <p style="font-size: 15px; margin: 5px 0;">
        Monto Total Pagado: ${monto}
    </p>
    <p style="font-size: 15px; margin: 5px 0;">
        Fecha y Hora: ${fecha}
    </p>


    </ul>
        </div>
        <div class="footer">
            <p>Este es un correo automático, por favor no respondas.</p>
            <p>&copy; 2025 RestoApp. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
  `,

    facturaHTML: (datos: FacturaData) => `
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<style>
    * {
        box-sizing: border-box;
        font-family: Arial, sans-serif;
    }

    body {
        width: 21cm;
        min-height: 27cm;
        max-height: 29.7cm;
        font-size: 13px;
    }

    .wrapper {
        border: 1.5px solid #333;
        padding: 5px;
    }

    .text-left {
        text-align: left;
    }

    .text-center {
        text-align: center;
    }

    .text-right {
        text-align: right;
    }

    .bold {
        font-weight: bold;
    }

    .italic {
        font-style: italic;
    }

    .inline-block {
        display: inline-block;
    }

    .flex {
        display: flex;
        flex-wrap: wrap;
    }

    .no-margin {
        margin: 0;
    }

    .relative {
        position: relative;
    }

    .floating-mid {
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        width: 75px;
        position: absolute;
        top: 1px;
        background: #fff;
    }

    .space-around {
        justify-content: space-around;
    }

    .space-between {
        justify-content: space-between;
    }

    .w50 {
        width: 50%;
    }

    th {
        border: 1px solid #000;
        background: #ccc;
        padding: 5px;
    }

    td {
        padding: 5px;
        font-size: 11px;
    }

    table {
        border-collapse: collapse;
        width: 100%;
    }

    .text-20 {
        font-size: 20px;
    }

    /* ESTILOS ADICIONALES PARA LA FACTURA */
    .header-logo {
        max-width: 100px; /* Tamaño máximo del logo */
        margin-right: 15px;
        align-self: flex-start;
    }
    .total-display {
        background-color: #f0f0f0;
        border: 2px solid #ccc;
        padding: 15px;
        margin-top: 10px;
    }
    .total-amount {
        font-size: 32px;
        color: #d9534f; /* Rojo de RestoApp */
    }
    .detalle-tabla th, .detalle-tabla td {
        border: 1px solid #ddd;
    }
</style>

<body>
    <!-- HEADER CON LOGO Y DATOS COMERCIO -->
    <div class="header-comercio" style="background: #8b0000; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
        <div class="logo-section">
            <img src="https://zomglcsymkilqvdqcnvr.supabase.co/storage/v1/object/public/logo/icon-only.png" alt="" style="max-width: 120px;">
        </div>
        <div class="datos-comercio" style="text-align: right; font-size: 14px;">
            <ul style="list-style-type: none;">
                <li style="margin: 3px 0;"><b>Domicilio Comercial:</b> Av. Mitre 750</li>
                <li style="margin: 3px 0;"><b>Email:</b> resto.app.official@gmail.com</li>
                <li style="margin: 3px 0;"><b>Tel:</b> +54 11 1234-4321</li>
                <li style="margin: 3px 0;"><b>CUIT:</b> 20-123456789-9</li>
            </ul>
        </div>
    </div>

    <!-- SECCION FACTURA -->
    <div class="wrapper" style="border: 3px solid black; margin: 10px 0;">
        <div class="flex" style="border-bottom: 2px solid black;">
            <!-- FACTURA C -->
            <div style="width: 40%; padding: 20px; border-right: 2px solid black;">
                <h2 style="margin: 0; font-size: 32px; font-weight: bold; text-align: center;">FACTURA</h2>
                <div style="text-align: center; font-size: 72px; font-weight: bold; margin: 20px 0;">C</div>
                <p style="text-align: center; margin: 0; font-size: 14px;">Cliente final</p>
            </div>
            <!-- DATOS FACTURA -->
            <div style="width: 60%; padding: 20px; margin:34px 0px">
                <p style="margin: 5px 0; font-size: 16px;"><b>Número de Factura:</b> ${datos.NUMERO_FACTURA || datos.pedidoId}</p>
                <p style="margin: 5px 0; font-size: 16px;"><b>Número del Pedido:</b> ${datos.pedidoId}</p>
                <p style="margin: 5px 0; font-size: 16px;"><b>Fecha:</b> ${datos.fecha}</p>
                <br>
            </div>
        </div>

        <!-- DATOS DEL CLIENTE -->
        <div style="background: #ebebeb; padding: 15px; border-bottom: 2px solid black;">
            <h2 style="margin: 0 0 10px 0;">Datos del Cliente</h2>
            <p style="margin: 5px 0;"><b>DNI:</b> ${datos.cliente_dni || 0}</p>
            <p style="margin: 5px 0;"><b>Apellido y Nombre:</b> ${datos.cliente_nombre || 'Sin Nombre'} ${datos.cliente_apellido || ''}</p>
            <p style="margin: 5px 0;"><b>Condición frente al IVA:</b> Consumidor Final</p>
        </div>

        <!-- DETALLES LABEL -->
        <div style="padding: 15px; border-bottom: 1px solid #ccc;">
            <h2 style="margin: 0;">Detalles</h2>
        </div>


        <!-- TABLA DE PRODUCTOS -->
        <div style="padding: 0;">
            <!-- HEADER ROJO DE LA TABLA CON COLUMNAS -->
            <div style="background: #a53232; padding: 8px; border-bottom: 2px solid black; display: flex; color: white; font-weight: bold;">
                <div style="width: 10%; text-align: left;">Cód.</div>
                <div style="width: 40%; text-align: left;">Producto / Servicio</div>
                <div style="width: 15%; text-align: right;">Cantidad</div>
                <div style="width: 15%; text-align: right;">Precio Unit.</div>
                <div style="width: 20%; text-align: right;">Subtotal</div>
            </div>
            
            <!-- CONTENIDO DE LA TABLA -->
            <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                    ${datos.items_facturados.map(item => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 10%;">${item.id}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 40%;">${item.nombre}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 15%;">${item.cantidad}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 15%;">$${item.precio_unitario.toFixed(2)}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: right; width: 20%;">$${(item.cantidad * item.precio_unitario).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- TOTALES -->
        <div style="padding: 20px; text-align: right;">
            <p style="margin: 5px 0; font-size: 16px;"><b>subtotal:</b> $${(datos.SUBTOTAL).toFixed(2)}</p>
            <p style="margin: 5px 0; font-size: 16px;"><b>descuento:</b> -$${datos.DESCUENTO_APLICADO.toFixed(2)}</p>
            <p style="margin: 5px 0; font-size: 16px;"><b>propina:</b> $${datos.IMPORTE_PROPINA.toFixed(2)}</p>
            <p style="margin: 10px 0; font-size: 24px; font-weight: bold; border-top: 2px solid black; padding-top: 10px;"><b>TOTAL: $${(datos.SUBTOTAL - datos.DESCUENTO_APLICADO + datos.IMPORTE_PROPINA).toFixed(2)}</b></p>
        </div>
    </div>
</body>
</html>`

};

// También puedes exportar individualmente si prefieres
export const aprobadoTemplate = EmailTemplates.aprobado;
export const rechazadoTemplate = EmailTemplates.rechazado;
export const facturaTemplate = EmailTemplates.facturaHTML;
export const mailFactura = EmailTemplates.mailFactura;

// Export por defecto
export default EmailTemplates;