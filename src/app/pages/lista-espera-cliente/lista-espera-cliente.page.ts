import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ListaEsperaService, ClienteEspera } from 'src/app/services/lista-espera.service';
import { ClienteService } from 'src/app/services/cliente.service';
import { ToastController, AlertController } from '@ionic/angular';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';
import { Notification } from 'src/app/services/notification';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';

@Component({
  selector: 'app-lista-espera-cliente',
  templateUrl: './lista-espera-cliente.page.html',
  styleUrls: ['./lista-espera-cliente.page.scss'],
  standalone: false
})
export class ListaEsperaClientePage implements OnInit {
  
  mostrarFormulario = signal<boolean>(true);
  estado = signal<string>(''); // Nuevo signal para el estado del cliente en espera
  clienteEnEspera: ClienteEspera | null = null;
  
  // Datos del formulario
  nombreCliente = '';
  cantidadPersonas = 0;
  
  // Estado
  isLoading = false;
  isRefreshing = false;
  posicionEnLista = 0;
  ultimaActualizacion: Date | null = null;

  constructor(
    private router: Router,
    private listaEsperaService: ListaEsperaService,
    private clienteService: ClienteService,
    private toastCtrl: ToastController,
    private customLoader: CustomLoaderService,
    private alertCtrl: AlertController,
    private notificationService: Notification,
    private tipoClienteService: TipoClienteService
  ) { }

  async ngOnInit() {
    this.customLoader.show('Cargando información...');

    try {
    // Cargar el nombre del cliente logueado
    await this.cargarNombreCliente();
    await this.verificarEnLista();
    }catch (error) {
      console.error('Error:', error);
      this.customLoader.hide();
    }
    this.customLoader.hide();
  }

  /**
   * Cargar el nombre del cliente logueado
   */
  async cargarNombreCliente() {
    try {
      this.nombreCliente = await this.clienteService.getNombreCliente();
      console.log('✅ Nombre del cliente cargado:', this.nombreCliente);
    } catch (error) {
      console.error('❌ Error cargando nombre del cliente:', error);
      this.nombreCliente = 'Cliente';
      await this.presentToast('Error obteniendo información del usuario', 'warning');
    }
  }

  /**
   * Agregar cliente a la lista de espera
   */
  async agregarALista() {
    if (!this.validarFormulario()) return;

    await this.customLoader.show('Agregando a la lista de espera...');

    try {
      const cliente = await this.listaEsperaService.agregarClienteEspera({
        nombre_cliente: this.nombreCliente,
        cantidad_personas: this.cantidadPersonas
      });

      if (cliente && cliente.success) {
        this.estado.set('esperando');
        this.mostrarFormulario.set(false);

        await this.presentToast(
          `¡Agregado a la lista!`,
          'success'
        );
        await this.iniciarActualizacionAutomatica();
        this.notificationService.sendNotificationToPerfil(
          'maitre',
          'Nuevo cliente en lista de espera',
          `${this.nombreCliente} se ha unido a la lista de espera.`,
          '/tabs-maitre/tab1-espera'
        )
      } else {
        await this.presentToast('Error al agregar a la lista', 'danger');
      }

    } catch (error) {
      console.error('Error:', error);
      await this.presentToast('Error inesperado', 'danger');
    } finally {
      await this.customLoader.hide();
    }
  }

  /**
   * Cancelar turno
   */
  async cancelarTurno() {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar Turno',
      message: '¿Estás seguro de que deseas cancelar tu turno?',
      buttons: [
        {
          text: 'No',
          role: 'cancel'
        },
        {
          text: 'Sí, cancelar',
          role: 'destructive',
          handler: async () => {
            await this.confirmarCancelacion();
          }
        }
      ]
    });
    await alert.present();
  }

  private async confirmarCancelacion() {
    if (!this.clienteEnEspera) return;

    await this.customLoader.show('Cancelando turno...');

    try {
      const cancelado = await this.listaEsperaService.cancelarTurno(this.clienteEnEspera.id!);
      
      if (cancelado) {
        await this.presentToast('Turno cancelado exitosamente', 'success');
        this.router.navigate(['/home']);
      } else {
        await this.presentToast('Error al cancelar turno', 'danger');
      }

    } catch (error) {
      console.error('Error:', error);
      await this.presentToast('Error inesperado', 'danger');
    } finally {
      await this.customLoader.hide();
    }
  }

  /**
   * Actualización automática del estado
   */
  private async iniciarActualizacionAutomatica() {
    this.listaEsperaService.suscribirCambios(this.estado, this.volverAHome.bind(this));
  }

  private volverAHome(){
    this.router.navigate(['/home-cliente']);
  }


  async verificarEnLista(){
    const isAnonimo = await this.tipoClienteService.isAnonimo();
    this.clienteEnEspera = await this.listaEsperaService.buscarClienteEnLista(await this.clienteService.getClientId(), isAnonimo);
    this.estado.set(this.clienteEnEspera ? this.clienteEnEspera.estado : '');
    if(this.clienteEnEspera){
      this.mostrarFormulario.set(false);
      console.log("Cliente encontrado: ", this.clienteEnEspera);
      await this.iniciarActualizacionAutomatica();
    }

  }

  private validarFormulario(): boolean {
    if (!this.nombreCliente || !this.nombreCliente.trim()) {
      this.presentToast('Error: No se pudo obtener tu nombre. Intenta recargar la página.', 'danger');
      return false;
    }
    
    if (this.cantidadPersonas < 1 || this.cantidadPersonas > 12) {
      this.presentToast('La cantidad de personas debe ser entre 1 y 12', 'warning');
      return false;
    }

    return true;
  }


  private async presentToast(message: string, color: string = 'medium') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // Getters para el template
  get estadoTexto(): string {
    if (!this.clienteEnEspera) return '';
    
    switch (this.clienteEnEspera.estado) {
      case 'esperando':
        return 'En espera';
      case 'llamado':
        return '¡Llamado! Dirígete a recepción';
      case 'asignado':
        return 'Mesa asignada';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Estado desconocido';
    }
  }

  get estadoColor(): string {
    if (!this.clienteEnEspera) return 'medium';
    
    switch (this.clienteEnEspera.estado) {
      case 'esperando':
        return 'warning';
      case 'llamado':
        return 'success';
      case 'asignado':
        return 'primary';
      case 'cancelado':
        return 'danger';
      default:
        return 'medium';
    }
  }
}