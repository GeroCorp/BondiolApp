import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/supabase';
import { ToastController, AlertController } from '@ionic/angular';
import { PerfilService } from 'src/app/services/perfilService';
import { Notification } from 'src/app/services/notification';

import { HapticService } from 'src/app/services/haptic.service';
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  loading = signal<boolean>(false);
  email= signal<string | null>(null);
  perfil= signal<string>("");
  private notificationService: Notification = inject(Notification);

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private perfilService: PerfilService,
    private alertController: AlertController,
    private hapticService: HapticService
  ) {
    console.log('Perfil recibido en Home:', this.perfil());
  }
  
  async ngOnInit() {
    this.loading.set(true);
    try {
      const perfilData = await this.authService.getUsuarioConPerfil();
      this.perfil.set(perfilData ? perfilData.perfil : "");
      this.email = history.state['email'] ?? null;

      console.log('Perfil cargado en Home:', this.perfil());
        
        // Establecer tag de perfil en OneSignal cuando carga el home
        if (this.perfil()) {
          this.perfilService.setPerfil(this.perfil());
          this.notificationService.setUserTag(this.perfil());

        }
    } catch (error) {
      console.error('Error al cargar el perfil:', error);
      this.showToast('Error al cargar el perfil. Intente nuevamente.');
    }finally {
      this.loading.set(false);
    }
    
  }

async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          cssClass: 'danger',
          handler: async () => {
            try {
              // Limpiar tags de OneSignal al cerrar sesión
              this.authService.logout()
              const toast = await this.toastController.create({
                message: 'Sesión cerrada correctamente',
                duration: 2000,
                color: 'success'
              });
              await toast.present();
              
              this.router.navigate(['/login'], { replaceUrl: true });
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              const toast = await this.toastController.create({
                message: 'Error al cerrar sesión',
                duration: 2000,
                color: 'danger'
              });
              await toast.present();
              await this.hapticService.vibrateError();
            }
          }
        }
      ]
    });

    await alert.present();
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
  verReservasAdmin() {
    this.router.navigate(['/gestion-reservas'], {replaceUrl: true});
  }
  gestionarDelivery() {
    this.router.navigate(['/tabs-admin/tab6-admin-delivery'], { replaceUrl: true });
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


  verPedidosDelivery() {
    this.router.navigate(['/tabs-delivery/tab1-pedidos'], { replaceUrl: true });
  }
  verChatsClientes() {
    this.router.navigate(['/tabs-delivery/tab2-menu-chats'], { replaceUrl: true });
  }



}
