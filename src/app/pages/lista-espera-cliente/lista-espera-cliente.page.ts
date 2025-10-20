import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ListaEsperaService, ClienteEspera } from 'src/app/services/lista-espera.service';
import { ClienteService } from 'src/app/services/cliente.service';
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
  isRefreshing = false;
  posicionEnLista = 0;
  ultimaActualizacion: Date | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private listaEsperaService: ListaEsperaService,
    private clienteService: ClienteService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) { }

  async ngOnInit() {
    // Cargar el nombre del cliente logueado
    await this.cargarNombreCliente();
    
    // Verificar si viene con un ID de cliente
    const clienteId = this.route.snapshot.queryParamMap.get('id');
    if (clienteId) {
      await this.consultarEstado(clienteId);
    }
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
   * Actualizar estado manualmente (botón)
   */
  async actualizarEstadoManual() {
    if (!this.clienteEnEspera || !this.clienteEnEspera.id || this.isRefreshing) {
      if (this.isRefreshing) {
        await this.presentToast('Ya se está actualizando...', 'warning');
      } else {
        await this.presentToast('No hay información para actualizar', 'warning');
      }
      return;
    }

    this.isRefreshing = true;
    const loading = await this.loadingCtrl.create({
      message: 'Actualizando estado...',
      duration: 3000
    });
    await loading.present();

    try {
      const resultado = await this.listaEsperaService.consultarEstadoPorId(this.clienteEnEspera.id);
      
      if (resultado && resultado.success && resultado.data) {
        const estadoAnterior = this.clienteEnEspera.estado;
        
        this.clienteEnEspera = resultado.data;
        this.posicionEnLista = resultado.posicion || 0;
        this.ultimaActualizacion = new Date();
        
        if (estadoAnterior !== this.clienteEnEspera.estado) {
          let mensaje = '';
          switch (this.clienteEnEspera.estado) {
            case 'llamado':
              mensaje = '🔔 ¡Te han llamado! Dirígete a recepción';
              break;
            case 'asignado':
              mensaje = `🎉 ¡Mesa asignada! Mesa #${this.clienteEnEspera.mesa_asignada}`;
              break;
            case 'cancelado':
              mensaje = '❌ Tu turno ha sido cancelado';
              break;
            case 'ausente':
              mensaje = '⚠️ Has sido marcado como ausente';
              break;
            default:
              mensaje = '✅ Estado actualizado correctamente';
          }
          await this.presentToast(mensaje, this.estadoColor);
        } else {
          await this.presentToast('Sin cambios en tu estado', 'medium');
        }
      } else {
        await this.presentToast('No se pudo obtener información actualizada', 'warning');
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
      await this.presentToast('Error al actualizar', 'danger');
    } finally {
      this.isRefreshing = false;
      await loading.dismiss();
    }
  }

  /**
   * Handle refresh manual
   */
  async handleRefresh(event: any) {
    try {
      // Si no hay cliente en espera, no hay nada que actualizar
      if (!this.clienteEnEspera || !this.clienteEnEspera.id) {
        await this.presentToast('No hay información para actualizar', 'warning');
        event.target.complete();
        return;
      }

      console.log('🔄 Actualizando estado del cliente...');
      
      // Consultar el estado actualizado
      const resultado = await this.listaEsperaService.consultarEstadoPorId(this.clienteEnEspera.id);
      
      if (resultado && resultado.success && resultado.data) {
        const estadoAnterior = this.clienteEnEspera.estado;
        
        // Actualizar datos
        this.clienteEnEspera = resultado.data;
        this.posicionEnLista = resultado.posicion || 0;
        this.ultimaActualizacion = new Date();
        
        // Mostrar mensaje de cambio de estado si es diferente
        if (estadoAnterior !== this.clienteEnEspera.estado) {
          let mensaje = '';
          switch (this.clienteEnEspera.estado) {
            case 'llamado':
              mensaje = '🔔 ¡Te han llamado! Dirígete a recepción';
              break;
            case 'asignado':
              mensaje = `🎉 ¡Mesa asignada! Mesa #${this.clienteEnEspera.mesa_asignada}`;
              break;
            case 'cancelado':
              mensaje = '❌ Tu turno ha sido cancelado';
              break;
            case 'ausente':
              mensaje = '⚠️ Has sido marcado como ausente';
              break;
            default:
              mensaje = '✅ Estado actualizado correctamente';
          }
          await this.presentToast(mensaje, this.estadoColor);
        } else {
          await this.presentToast('✅ Estado actualizado', 'success');
        }
        
        console.log('✅ Estado actualizado:', this.clienteEnEspera.estado);
      } else {
        await this.presentToast('⚠️ No se pudo obtener información actualizada', 'warning');
        console.warn('❌ No se pudo consultar el estado');
      }
      
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      await this.presentToast('❌ Error al actualizar', 'danger');
    } finally {
      // Completar el refresher
      event.target.complete();
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
        this.ultimaActualizacion = new Date();
        
      }
    }, 30000); // Actualizar cada 30 segundos
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