import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/supabase';
import { EmailService } from 'src/app/services/email';
import { PerfilService } from 'src/app/services/perfilService';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

interface Cliente {
  id_cliente?: number;
  user_id?: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  foto?: string | null;
  estado?: string;
  created_at?: string;
}

@Component({
  selector: 'app-tab3-admin-cliente',
  templateUrl: './tab3-admin-cliente.page.html',
  styleUrls: ['./tab3-admin-cliente.page.scss'],
  standalone: false
})
export class Tab3AdminClientePage implements OnInit {
  perfil: string | null = null;
  clientes: Cliente[] = [];

  constructor(
    private authService: AuthService,
    private emailService: EmailService,
    private perfilService: PerfilService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private router: Router
  ) {
    this.perfil = this.perfilService.getPerfil();
    console.log('Perfil recibido en Tab3 Admin Cliente:', this.perfil);
  }

  ngOnInit(): void {
    this.cargarClientes();
  }

  async presentToast(
    message: string,
    color: 'success' | 'warning' | 'danger' | 'medium' = 'medium'
  ) {
    const t = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await t.present();
  }

  async cargarClientes() {
  const loader = await this.loadingCtrl.create({ 
    message: 'Cargando clientes pendientes...' 
  });
  await loader.present();
  
  try {
    console.log('📋 [ADMIN] Cargando clientes pendientes...');
    
    this.clientes = await this.authService.getClientesPendientes();
    
    console.log('✅ [ADMIN] Clientes pendientes obtenidos:', {
      cantidad: this.clientes.length,
      clientes: this.clientes.map(c => ({
        id: c.id_cliente,
        nombre: `${c.nombre} ${c.apellido}`,
        email: c.email,
        estado: c.estado,
        dni: c.dni
      }))
    });
    
    // 🔍 DIAGNÓSTICO: Verificar si hay clientes OAuth
    const clientesOAuth = this.clientes.filter(c => c.dni?.startsWith('OAUTH-'));
    if (clientesOAuth.length > 0) {
      console.log('🔍 [ADMIN] Clientes OAuth encontrados:', clientesOAuth.length);
    }
    
  } catch (err: any) {
    console.error('❌ [ADMIN] Error cargando clientes:', err);
    await this.presentToast(
      'Error cargando clientes: ' + (err.message ?? err), 
      'danger'
    );
  } finally {
    await loader.dismiss();
  }
}

async diagnosticarClientesPendientes() {
  try {
    console.log('🔍 [DIAGNÓSTICO] Iniciando verificación de clientes pendientes...');
    
    // Verificar directamente en la tabla clientes
    const { data: todosClientes, error } = await this.authService.client
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error obteniendo todos los clientes:', error);
      return;
    }
    
    console.log('📊 [DIAGNÓSTICO] Total de clientes en BD:', todosClientes?.length || 0);
    
    // Filtrar por estado
    const pendientes = todosClientes?.filter(c => c.estado === 'pendiente') || [];
    const aprobados = todosClientes?.filter(c => c.estado === 'aprobado') || [];
    const rechazados = todosClientes?.filter(c => c.estado === 'rechazado') || [];
    
    console.log('📊 [DIAGNÓSTICO] Resumen por estado:', {
      pendientes: pendientes.length,
      aprobados: aprobados.length,
      rechazados: rechazados.length
    });
    
    // Mostrar detalles de pendientes
    if (pendientes.length > 0) {
      console.log('📋 [DIAGNÓSTICO] Clientes pendientes:');
      pendientes.forEach((cliente, index) => {
        console.log(`  ${index + 1}. ${cliente.nombre} ${cliente.apellido}`, {
          id: cliente.id_cliente,
          email: cliente.email,
          dni: cliente.dni,
          user_id: cliente.user_id,
          created_at: cliente.created_at
        });
      });
    } else {
      console.log('⚠️ [DIAGNÓSTICO] No hay clientes pendientes en la BD');
    }
    
    // Verificar clientes OAuth
    const clientesOAuth = todosClientes?.filter(c => c.dni?.startsWith('OAUTH-')) || [];
    if (clientesOAuth.length > 0) {
      console.log('🔍 [DIAGNÓSTICO] Clientes OAuth encontrados:', clientesOAuth.length);
      clientesOAuth.forEach((cliente, index) => {
        console.log(`  ${index + 1}. ${cliente.nombre} ${cliente.apellido}`, {
          estado: cliente.estado,
          email: cliente.email,
          created_at: cliente.created_at
        });
      });
    }
    
    await this.presentToast(
      `Diagnóstico completo. Ver consola (F12) para detalles.`,
      'medium'
    );
    
  } catch (error) {
    console.error('❌ [DIAGNÓSTICO] Error:', error);
  }
}

  async aprobarCliente(cliente: Cliente) {
    // Confirmación antes de aprobar
    const alert = await this.alertCtrl.create({
      header: 'Aprobar Cliente',
      message: `¿Estás seguro de aprobar a ${cliente.nombre} ${cliente.apellido}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aprobar',
          handler: async () => {
            await this.procesarAprobacion(cliente);
          }
        }
      ]
    });

    await alert.present();
  }

  private async procesarAprobacion(cliente: Cliente) {
    if (!cliente.id_cliente || !cliente.user_id) {
      await this.presentToast('Error: datos de cliente incompletos', 'danger');
      return;
    }

    const loader = await this.loadingCtrl.create({ 
      message: 'Aprobando cliente...' 
    });
    await loader.present();

    try {
      // 1. Actualizar estado en BD
      await this.authService.actualizarEstadoCliente(cliente.id_cliente, 'aprobado');

      // // 2. Confirmar email en auth.users
      // await this.authService.confirmarEmailCliente(cliente.user_id);

      // 3. Obtener email del usuario
      const user = await this.authService.getUserById(cliente.user_id);
      const emailDestino = cliente.email || user?.email;

      if (!emailDestino) {
        await loader.dismiss();
        await this.presentToast('Cliente aprobado pero sin email para notificar', 'warning');
        await this.cargarClientes();
        return;
      }

      // 4. Enviar email de aprobación
      const emailEnviado = await this.emailService.enviarEmailAprobacionConTemplate(cliente)

      await loader.dismiss();

      if (emailEnviado) {
        await this.presentToast(
          `✅ Cliente aprobado y notificado por email`, 
          'success'
        );
      } else {
        await this.presentToast(
          'Cliente aprobado pero hubo un error al enviar el email', 
          'warning'
        );
      }

      await this.cargarClientes();
      
    } catch (err: any) {
      await loader.dismiss();
      console.error('Error al aprobar cliente:', err);
      await this.presentToast(
        'Error al aprobar: ' + (err.message ?? err), 
        'danger'
      );
    }
  }

  async rechazarCliente(cliente: Cliente) {
    // Confirmación antes de rechazar
    const alert = await this.alertCtrl.create({
      header: 'Rechazar Cliente',
      message: `¿Estás seguro de rechazar a ${cliente.nombre} ${cliente.apellido}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Rechazar',
          role: 'destructive',
          handler: async () => {
            await this.procesarRechazo(cliente);
          }
        }
      ]
    });

    await alert.present();
  }

  private async procesarRechazo(cliente: Cliente) {
    if (!cliente.id_cliente || !cliente.user_id) {
      await this.presentToast('Error: datos de cliente incompletos', 'danger');
      return;
    }

    const loader = await this.loadingCtrl.create({ 
      message: 'Rechazando cliente...' 
    });
    await loader.present();

    try {
      // 1. Actualizar estado en BD
      await this.authService.actualizarEstadoCliente(cliente.id_cliente, 'rechazado');

      // 2. Obtener email del usuario
      const user = await this.authService.getUserById(cliente.user_id);
      const emailDestino = cliente.email || user?.email;

      if (!emailDestino) {
        await loader.dismiss();
        await this.presentToast('Cliente rechazado pero sin email para notificar', 'warning');
        await this.cargarClientes();
        return;
      }

      // 3. Enviar email de rechazo
      const emailEnviado = await this.emailService.enviarEmailRechazoConTemplate(cliente);

      await loader.dismiss();

      if (emailEnviado) {
        await this.presentToast(
          `❌ Cliente rechazado y notificado por email`, 
          'warning'
        );
      } else {
        await this.presentToast(
          'Cliente rechazado pero hubo un error al enviar el email', 
          'warning'
        );
      }

      await this.cargarClientes();
      
    } catch (err: any) {
      await loader.dismiss();
      console.error('Error al rechazar cliente:', err);
      await this.presentToast(
        'Error al rechazar: ' + (err.message ?? err), 
        'danger'
      );
    }
  }

}