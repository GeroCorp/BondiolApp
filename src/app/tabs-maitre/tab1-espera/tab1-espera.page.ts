import { Component, OnInit } from '@angular/core';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { AuthService } from 'src/app/services/supabase';
import { ListaEsperaService, ClienteEspera } from 'src/app/services/lista-espera.service';

@Component({
  selector: 'app-tab1-espera',
  standalone: false,
  templateUrl: './tab1-espera.page.html',
  styleUrls: ['./tab1-espera.page.scss']
})
export class Tab1Espera implements OnInit {
  clientes: any[] = [];
  clientesListaEspera: ClienteEspera[] = [];
  mesas: any[] = [];
  isLoading = false;
  mostrarTodos = false;

  constructor(
    private supabaseService: AuthService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private clienteService: ClienteService,
    private listaEsperaService: ListaEsperaService
  ) {}

  async ngOnInit() {

  }

  async ionViewWillEnter() {
    await this.cargarDatos();
  }

  // 🔹 Cargar solo datos necesarios (lista espera y mesas)
  async cargarDatos() {
    await Promise.all([
      this.cargarClientesListaEspera(),
      this.cargarMesas(),
    ]);
  }


  test(bool: boolean){
    console.log(bool);
  }

  // Método eliminado - ya no cargamos clientes anónimos
  // async cargarClientes() { ... }

  // 🔹 Cargar clientes de la lista de espera (NUEVO)
  async cargarClientesListaEspera() {
    try {
      console.log('🔄 Cargando lista de espera...');
      if (this.mostrarTodos) {
        this.clientesListaEspera = await this.listaEsperaService.getTodosLosClientes();
      } else {
        this.clientesListaEspera = await this.listaEsperaService.getListaEspera();
      }
      console.log('✅ Lista de espera cargada:', this.clientesListaEspera.length);
    } catch (err) {
      console.error('❌ Error cargando lista de espera:', err);
      
      const toast = await this.toastCtrl.create({
        message: 'Error al cargar lista de espera',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  // 🔹 Cargar mesas disponibles (CORREGIDO)
  async cargarMesas() {
    try {
      console.log('🔄 Cargando mesas disponibles...');
      this.mesas = await this.supabaseService.getMesasDisponibles();
      console.log('✅ Mesas disponibles cargadas:', this.mesas.length);
    } catch (err) {
      console.error('❌ Error cargando mesas:', err);
      
      const toast = await this.toastCtrl.create({
        message: 'Error al cargar mesas disponibles',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }


  // 🔹 Asignar mesa a cliente anónimo o registrado
  async asignarMesa(cliente: any, isAnonimo: boolean) {
    if (!this.mesas || this.mesas.length === 0) {
      const toast = await this.toastCtrl.create({
        message: 'No hay mesas disponibles',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: `Asignar mesa a ${cliente.nombre}`,
      message: 'Seleccione una mesa disponible:',
      inputs: this.mesas.map(mesa => ({
        name: 'mesa',
        type: 'radio',
        label: `Mesa ${mesa.numero} (${mesa.tipo} - ${mesa.cantidad} personas)`,
        value: mesa.id,
        checked: false
      })),
      buttons: [
        { 
          text: 'Cancelar', 
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Asignar',
          handler: async (mesaId) => {
            if (!mesaId) {
              const toast = await this.toastCtrl.create({
                message: 'Debe seleccionar una mesa',
                duration: 2000,
                color: 'warning'
              });
              await toast.present();
              return false; // Mantener el alert abierto
            }
            if (isAnonimo){
              await this.procesarAsignacion(cliente, mesaId, true);
            }else await this.procesarAsignacion(cliente, mesaId, false)
            return true; // Cerrar el alert
          }
        }
      ]
    });

    await alert.present();
  }

  // 🔹 Procesar la asignación de mesa (NUEVO MÉTODO)
  private async procesarAsignacion(cliente: any, mesaId: number, isAnonimo: boolean) {
    const loading = await this.toastCtrl.create({
      message: 'Asignando mesa...',
      duration: 0
    });
    await loading.present();

    try {
      console.log('🔄 Procesando asignación:', { 
        clienteId: cliente.id_clienteanonimo, 
        mesaId 
      });

      if (isAnonimo){
      await this.supabaseService.asignarMesaAClienteAnonimo(
        cliente.id_clienteanonimo, 
        mesaId
      );}
      else await this.clienteService.setMesa(cliente.id_cliente, mesaId)

      await loading.dismiss();

      const mesaAsignada = this.mesas.find(m => m.id === mesaId);
      const toast = await this.toastCtrl.create({
        message: `Mesa ${mesaAsignada?.numero} asignada a ${cliente.nombre}`,
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Recargar datos
      await this.cargarDatos();

    } catch (err: any) {
      await loading.dismiss();
      
      console.error('❌ Error asignando mesa:', err);
      
      const toast = await this.toastCtrl.create({
        message: err.message || 'Error al asignar mesa',
        duration: 4000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  // 🔹 Método para refrescar datos (para ion-refresher)
  async refrescarDatos(event: any) {
    await this.cargarDatos();
    event.target.complete();
  }

  // 🔹 Formatear fecha para mostrar en la UI
  formatearFecha(fecha: string | Date | undefined): string {
    if (!fecha) return 'Fecha no disponible';
    
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const ahora = new Date();
    const diff = ahora.getTime() - fechaObj.getTime();
    const minutos = Math.floor(diff / (1000 * 60));
    
    if (minutos < 1) return 'Ahora mismo';
    if (minutos < 60) return `Hace ${minutos} min`;
    
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    
    return fechaObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFechaCliente(cliente: any): Date {
    return cliente.created_at ? new Date(cliente.created_at) : new Date();
  }

  /**
   * Obtener el estado del cliente en formato amigable
   */
  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'esperando': return 'En espera';
      case 'llamado': return 'Llamado';
      case 'asignado': return 'Mesa asignada';
      case 'ausente': return 'Ausente';
      case 'cancelado': return 'Cancelado';
      default: return estado;
    }
  }

  /**
   * Obtener el color del badge según el estado
   */
  getColorEstado(estado: string): string {
    switch (estado) {
      case 'esperando': return 'warning';
      case 'llamado': return 'medium';
      case 'asignado': return 'secondary';
      case 'ausente': return 'medium';
      case 'cancelado': return 'danger';
      default: return 'medium';
    }
  }

  /**
   * Alternar entre mostrar solo clientes en espera o todos
   */
  toggleMostrarTodos() {
    this.mostrarTodos = !this.mostrarTodos;
    this.cargarClientesListaEspera();
  }

  /**
   * Obtener lista filtrada según la opción seleccionada
   */
  get clientesFiltrados(): ClienteEspera[] {
    if (this.mostrarTodos) {
      return this.clientesListaEspera;
    }
    return this.clientesListaEspera.filter(cliente => 
      cliente.estado === 'esperando' || cliente.estado === 'llamado'
    );
  }

  /**
   * Contar clientes por estado
   */
  contarClientesPorEstado(estado: string): number {
    return this.clientesFiltrados.filter(cliente => cliente.estado === estado).length;
  }

  /**
   * Llamar al siguiente cliente de la lista de espera
   */
  async llamarSiguienteCliente() {
    if (this.clientesListaEspera.length === 0) {
      const toast = await this.toastCtrl.create({
        message: 'No hay clientes en la lista de espera',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Llamar Cliente',
      message: `¿Llamar a ${this.clientesListaEspera[0].nombre_cliente}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Llamar',
          handler: async () => {
            await this.procesarLlamadaCliente();
          }
        }
      ]
    });
    await alert.present();
  }

  private async procesarLlamadaCliente() {
    try {
      const clienteLlamado = await this.listaEsperaService.llamarSiguienteCliente();
      
      if (clienteLlamado) {
        const toast = await this.toastCtrl.create({
          message: `Cliente ${clienteLlamado.nombre_cliente} llamado.`,
          duration: 3000,
          color: 'success'
        });
        await toast.present();
        
        // Recargar datos
        await this.cargarClientesListaEspera();
      } else {
        const toast = await this.toastCtrl.create({
          message: 'Error al llamar cliente',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Error llamando cliente:', error);
      const toast = await this.toastCtrl.create({
        message: 'Error inesperado al llamar cliente',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  /**
   * Asignar mesa a cliente de lista de espera
   */
  async asignarMesaListaEspera(cliente: ClienteEspera) {
    if (!this.mesas || this.mesas.length === 0) {
      const toast = await this.toastCtrl.create({
        message: 'No hay mesas disponibles',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Filtrar mesas apropiadas para la cantidad de personas
    const mesasApropiadas = this.mesas.filter(
      mesa => mesa.cantidad >= cliente.cantidad_personas
    );

    if (mesasApropiadas.length === 0) {
      const toast = await this.toastCtrl.create({
        message: `No hay mesas disponibles para ${cliente.cantidad_personas} personas`,
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: `Asignar mesa a ${cliente.nombre_cliente}`,
      message: `${cliente.cantidad_personas} personas`,
      inputs: mesasApropiadas.map(mesa => ({
        name: 'mesa',
        type: 'radio',
        label: `Mesa ${mesa.numero} (${mesa.tipo} - ${mesa.cantidad} personas)`,
        value: mesa.id,
        checked: false
      })),
      buttons: [
        { 
          text: 'Cancelar', 
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Asignar',
          handler: async (mesaId) => {
            if (!mesaId) {
              const toast = await this.toastCtrl.create({
                message: 'Debe seleccionar una mesa',
                duration: 2000,
                color: 'warning'
              });
              await toast.present();
              return false;
            }
            await this.procesarAsignacionListaEspera(cliente, mesaId);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async procesarAsignacionListaEspera(cliente: ClienteEspera, mesaId: number) {
    const loading = await this.toastCtrl.create({
      message: 'Asignando mesa...',
      duration: 0
    });
    await loading.present();

    try {
      const asignado = await this.listaEsperaService.asignarMesaListaEspera(cliente.id!, mesaId);
      
      await loading.dismiss();

      if (asignado) {
        const mesaAsignada = this.mesas.find(m => m.id === mesaId);
        const toast = await this.toastCtrl.create({
          message: `Mesa ${mesaAsignada?.numero} asignada a ${cliente.nombre_cliente}`,
          duration: 3000,
          color: 'success'
        });
        await toast.present();

        // Recargar datos
        await this.cargarDatos();
      } else {
        const toast = await this.toastCtrl.create({
          message: 'Error al asignar mesa',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }

    } catch (err: any) {
      await loading.dismiss();
      
      console.error('❌ Error asignando mesa:', err);
      
      const toast = await this.toastCtrl.create({
        message: err.message || 'Error al asignar mesa',
        duration: 4000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  /**
   * Marcar cliente como ausente
   */
  async marcarClienteAusente(cliente: ClienteEspera) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar',
      message: `¿Marcar a ${cliente.nombre_cliente} como ausente?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            try {
              const resultado = await this.listaEsperaService.marcarClienteAusente(cliente.id!);
              
              if (resultado) {
                const toast = await this.toastCtrl.create({
                  message: `${cliente.nombre_cliente} marcado como ausente`,
                  duration: 3000,
                  color: 'warning'
                });
                await toast.present();
                
                // Recargar lista
                await this.cargarClientesListaEspera();
              } else {
                throw new Error('No se pudo marcar como ausente');
              }
            } catch (error) {
              console.error('Error marcando ausente:', error);
              const toast = await this.toastCtrl.create({
                message: 'Error al marcar cliente ausente',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }
}
