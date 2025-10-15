import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ListaEsperaService, ClienteEspera } from 'src/app/services/lista-espera.service';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-lista-espera-cliente',
  templateUrl: './lista-espera-cliente.page.html',
  styleUrls: ['./lista-espera-cliente.page.scss'],
  standalone: false
})
export class ListaEsperaClientePage implements OnInit {
  
  mostrarFormulario = true;
  clienteEnEspera: ClienteEspera | null = null;
  
  // Datos del formulario
  nombreCliente = '';
  cantidadPersonas = 1;
  
  // Para consultar por ID
  consultarPorId: string | number = '';
  mostrarConsulta = false;
  
  // Estado
  isLoading = false;
  posicionEnLista = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private listaEsperaService: ListaEsperaService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) { }

  async ngOnInit() {
    // Verificar si viene con un ID de cliente
    const clienteId = this.route.snapshot.queryParamMap.get('id');
    if (clienteId) {
      await this.consultarEstado(clienteId);
    }
  }

  /**
   * Agregar cliente a la lista de espera
   */
  async agregarALista() {
    if (!this.validarFormulario()) return;

    const loading = await this.loadingCtrl.create({
      message: 'Agregando a la lista de espera...'
    });
    await loading.present();

    try {
      const cliente = await this.listaEsperaService.agregarClienteEspera({
        nombre_cliente: this.nombreCliente,
        cantidad_personas: this.cantidadPersonas
      });

      if (cliente && cliente.success) {
        this.clienteEnEspera = cliente.data;
        this.mostrarFormulario = false;
        await this.presentToast(
          `¡Agregado a la lista! Tu ID es: ${cliente.data.id}`,
          'success'
        );
        await this.iniciarActualizacionAutomatica();
      } else {
        await this.presentToast('Error al agregar a la lista', 'danger');
      }

    } catch (error) {
      console.error('Error:', error);
      await this.presentToast('Error inesperado', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Consultar estado por ID
   */
  async consultarEstado(clienteId: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Consultando estado...'
    });
    await loading.present();

    try {
      const id = parseInt(clienteId);
      const resultado = await this.listaEsperaService.consultarEstadoPorId(id);
      
      if (resultado && resultado.success && resultado.data) {
        this.clienteEnEspera = resultado.data;
        this.posicionEnLista = resultado.posicion || 0;
        this.mostrarFormulario = false;
        await this.iniciarActualizacionAutomatica();
      } else {
        await this.presentToast('Turno no encontrado', 'warning');
      }

    } catch (error) {
      console.error('Error:', error);
      await this.presentToast('Error al consultar estado', 'danger');
    } finally {
      await loading.dismiss();
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

    const loading = await this.loadingCtrl.create({
      message: 'Cancelando turno...'
    });
    await loading.present();

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
      await loading.dismiss();
    }
  }

  /**
   * Actualización automática del estado
   */
  private async iniciarActualizacionAutomatica() {
    if (!this.clienteEnEspera) return;

    const intervalo = setInterval(async () => {
      if (!this.clienteEnEspera) {
        clearInterval(intervalo);
        return;
      }

      const resultado = await this.listaEsperaService.consultarEstadoPorId(
        this.clienteEnEspera.id!
      );

      if (resultado && resultado.success && resultado.data) {
        this.clienteEnEspera = resultado.data;
        this.posicionEnLista = resultado.posicion || 0;
        
        // Si fue llamado, mostrar alerta
        if (resultado.data.estado === 'llamado') {
          await this.mostrarAlertaLlamado();
          clearInterval(intervalo);
        }
        
        // Si fue asignado, redirigir
        if (resultado.data.estado === 'asignado') {
          await this.mostrarAlertaAsignado();
          clearInterval(intervalo);
        }
      }
    }, 30000); // Actualizar cada 30 segundos
  }

  private async mostrarAlertaLlamado() {
    const alert = await this.alertCtrl.create({
      header: '¡Tu turno está listo!',
      message: `Cliente #${this.clienteEnEspera?.id} - Dirígete a la recepción`,
      buttons: ['Entendido'],
      backdropDismiss: false
    });
    await alert.present();
  }

  private async mostrarAlertaAsignado() {
    const alert = await this.alertCtrl.create({
      header: '¡Mesa asignada!',
      message: `Te han asignado la mesa #${this.clienteEnEspera?.mesa_asignada}`,
      buttons: [
        {
          text: 'Ir a mi mesa',
          handler: () => {
            this.router.navigate(['/cliente-registrado']);
          }
        }
      ],
      backdropDismiss: false
    });
    await alert.present();
  }

  private validarFormulario(): boolean {
    if (!this.nombreCliente.trim()) {
      this.presentToast('Ingresa tu nombre', 'warning');
      return false;
    }
    
    if (this.cantidadPersonas < 1 || this.cantidadPersonas > 12) {
      this.presentToast('La cantidad de personas debe ser entre 1 y 12', 'warning');
      return false;
    }

    return true;
  }

  /**
   * Consultar turno por ID
   */
  async consultarTurnoPorId() {
    // Convertir a string de forma segura
    let idStr: string;
    
    if (typeof this.consultarPorId === 'number') {
      idStr = this.consultarPorId.toString();
    } else if (typeof this.consultarPorId === 'string') {
      idStr = this.consultarPorId.trim();
    } else {
      idStr = '';
    }
    
    if (!idStr || idStr === '') {
      await this.presentToast('Ingresa tu ID', 'warning');
      return;
    }
    
    // Validar que sea un número válido
    const idNum = parseInt(idStr);
    if (isNaN(idNum) || idNum <= 0) {
      await this.presentToast('El ID debe ser un número válido mayor a 0', 'warning');
      return;
    }
    
    await this.consultarEstado(idStr);
  }

  /**
   * Mostrar/ocultar formulario de consulta
   */
  toggleConsulta() {
    this.mostrarConsulta = !this.mostrarConsulta;
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