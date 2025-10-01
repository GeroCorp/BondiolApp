import { Component, OnInit } from '@angular/core';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-tab1-espera',
  standalone: false,
  templateUrl: './tab1-espera.page.html',
  styleUrls: ['./tab1-espera.page.scss']
})
export class Tab1Espera implements OnInit {
  clientes: any[] = [];
  mesas: any[] = [];
  isLoading = false;

  constructor(
    private supabaseService: AuthService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private clienteService: ClienteService
  ) {}

  async ngOnInit() {

  }

  async ionViewWillEnter() {
    await this.cargarDatos();
  }

  // 🔹 Cargar todos los datos necesarios
  async cargarDatos() {
    await Promise.all([
      this.cargarClientes(),
      this.cargarMesas(),
    ]);
  }


  test(bool: boolean){
    console.log(bool);
  }

  // 🔹 Cargar clientes anónimos en espera (CORREGIDO)
  async cargarClientes() {
    this.isLoading = true;
    try {
      console.log('🔄 Cargando clientes en espera...');
      this.clientes = await this.supabaseService.getClientesAnonimosEnEspera();
      
      // Busca clientes registrados sin mesa asignada
      const clientesReg = await this.clienteService.getClientesEnEspera();

      // Los añade al array
      clientesReg.forEach( cliente => {
        this.clientes.push(cliente)
      })

      console.log('✅ Clientes cargados:', this.clientes.length);
    } catch (err) {
      console.error('❌ Error cargando clientes:', err);
      
      const toast = await this.toastCtrl.create({
        message: 'Error al cargar clientes en espera',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
    this.isLoading = false;
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
  formatearFecha(fecha: string | Date): string {
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
}
