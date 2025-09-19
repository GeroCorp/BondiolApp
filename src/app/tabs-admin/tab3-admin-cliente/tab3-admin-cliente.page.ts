import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/supabase';
import { PerfilService } from 'src/app/services/perfilService';
import { ToastController, LoadingController } from '@ionic/angular';

interface Cliente {
  id_cliente?: number;
  nombre: string;
  apellido: string;
  dni?: string;
  email?: string | null;
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
    private perfilService: PerfilService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
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
    const loader = await this.loadingCtrl.create({ message: 'Cargando clientes pendientes...' });
    await loader.present();
    try {
      this.clientes = await this.authService.getClientesPendientes();
    } catch (err: any) {
      console.error('Error cargando clientes:', err);
      await this.presentToast('Error cargando clientes: ' + (err.message ?? err), 'danger');
    } finally {
      await loader.dismiss();
    }
  }

  async aprobarCliente(cliente: Cliente) {
    if (!cliente.id_cliente) return;
    try {
      await this.authService.actualizarEstadoCliente(cliente.id_cliente, 'aprobado');
      await this.presentToast('Cliente aprobado ✅', 'success');
      await this.cargarClientes();
    } catch (err: any) {
      await this.presentToast('Error al aprobar: ' + (err.message ?? err), 'danger');
    }
  }

  async rechazarCliente(cliente: Cliente) {
    if (!cliente.id_cliente) return;
    try {
      await this.authService.actualizarEstadoCliente(cliente.id_cliente, 'rechazado');
      await this.presentToast('Cliente rechazado ❌', 'warning');
      await this.cargarClientes();
    } catch (err: any) {
      await this.presentToast('Error al rechazar: ' + (err.message ?? err), 'danger');
    }
  }
}
