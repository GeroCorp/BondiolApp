
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/supabase';
import { ToastController } from '@ionic/angular';
import { PerfilService } from 'src/app/services/perfilService';
import { Notification } from 'src/app/services/notification';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  email: string | null = null;
  perfil: string | null = null;
  private notificationService: Notification = inject(Notification);

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private perfilService: PerfilService
  ) {
    this.email = history.state['email'] ?? null;
    this.perfil = history.state['perfil'] ?? null;
    if (this.perfil) {
      this.perfilService.setPerfil(this.perfil);
    }
    console.log('Perfil recibido en Home:', this.perfil);
  }

  async ngOnInit() {
    // Establecer tag de perfil en OneSignal cuando carga el home
    if (this.perfil) {
      this.notificationService.setUserTag(this.perfil);
      
      // También establecer el External User ID (opcional pero recomendado)
      const user = await this.authService.getCurrentUser();
      if (user) {
        this.notificationService.setExternalUserId(user.id);
      }
    }
  }

async logout() {
    // Limpiar tags de OneSignal al cerrar sesión
    this.notificationService.clearUserTags();
    
    await this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
    this.showToast('Sesión cerrada correctamente');
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color: 'medium',
      position: 'bottom',
    });
    await toast.present();
  }

  async getCurrentUserName(){
    const id = await this.authService.getCurrentUser();
    if (!id){
      throw new Error('No user logged in');
    }
    const user = await this.authService.getClienteByUserId(id.id);
    console.log(user![0]?.nombre);
    const nombre = user![0]?.nombre ?? 'Invitado';

  }

  // Seccion de dueño y supervisor
  agregarEmpleado() {
    this.router.navigate(['/tabs-admin/tab1-carga-empleado'], {
      replaceUrl: true,
    }); // redirigir a tabs empleado
  }
  agregarMesa() {
    this.router.navigate(['/tabs-admin/tab2-carga-mesas'], {
      replaceUrl: true,
    }); // redirigir a tabs mesas
  }
  adminCliente() {
    this.router.navigate(['/tabs-admin/tab3-admin-cliente'], {
      replaceUrl: true,
    }); // Redirigir a tabs cliente
  }
  adminMesa() {
    this.router.navigate(['/tabs-admin/tab4-admin-mesa'], {replaceUrl: true}); // Redirigir a tabs mesa
  }


  // Seccion de cocinero y bartender
  agregarProducto() {
    this.router.navigate(['/tabs-cocinero-bartender/tab1-agregar-producto'], {
      replaceUrl: true,
    }); // redirigir a tabs producto
  }
  verMenu() {
    this.router.navigate(['/tabs-cocinero-bartender/tab3-menu'], {
      replaceUrl: true,
    }); // redirigir a tabs producto
  }
  recibirPedidos() {
    this.router.navigate(['/tabs-cocinero-bartender/tab2-recibir-pedido'], {
      replaceUrl: true,
    }); // redirigir a tabs pedidos
  }

  //Seccion maitre
  listaEspera() {
    this.router.navigate(['/tabs-maitre/tab1-espera'], { replaceUrl: true });
  }

  verMesas() {
    this.router.navigate(['/tabs-maitre/tab2-mesas'], { replaceUrl: true });
  }

  clientes() {
    this.router.navigate(['/tabs-maitre/tab3-clientes'], { replaceUrl: true });
  }

  // Sección de MOZO - NUEVA
  gestionarPedidos() {
    this.router.navigate(['/tabs-mozo/tab1-pedidos-pendientes'], { replaceUrl: true });
  }
  verPedidosConfirmados() {
    this.router.navigate(['/tabs-mozo/tab2-pedidos-confirmados'], { replaceUrl: true });
  }
  verConsultasClientes() {
    this.router.navigate(['/tabs-mozo/tab3-consultas'], { replaceUrl: true });
  }

}
