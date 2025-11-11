
export const aprobadoTemplate = (email:string, nombre:string) =>`<body style="margin: 0;
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
            <div class="logo" style="box-shadow: 0 4px 8px rgba(0,0,0,0.2);padding: 20px;
          width: fit-content;
          background-color: rgb(255,20,50);
          border-radius: 50%;
          margin: 0 auto 20px;">
                <img src="http://cdn.mcauto-images-production.sendgrid.net/7ffb83c7fa07769b/86a3281b-558f-4c20-a09d-6ca185860aad/1024x1024.png" alt="RestoApp Logo" height="80px" width="80px">
            </div>
            <h1 style="color: white;
            margin: 0;
            font-size: 28px;
            font-weight: 600;">RestoApp</h1>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">¡Hola ${nombre}!</h2>
            <div class="badge"
            style="
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-weight: bold;
            margin: 20px 0;
            "
            >✅ CUENTA APROBADA</div>
            <div style="
            color: #666;
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
        <div class="footer" 
        style="background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 14px;">
            <p>Este es un correo automático, por favor no respondas.</p>
            <p>&copy; 2025 RestoApp. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
`