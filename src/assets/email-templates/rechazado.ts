export const rechazadoTemplate =`<head>
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
            <h2>Hola {{nombre}},</h2>
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
</body>`;