import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';
import { HapticService } from 'src/app/services/haptic.service';

interface Consulta {
  id_consulta: number;
  mesa_id: number;
  cliente_id: number;
  mensaje: string;
  estado: string;
  respuesta?: string;
  created_at: string;
  mesa?: { numero: number };
  cliente?: { nombre: string; apellido: string };
  respuestaTemp?: string;
}

@Component({
  selector: 'app-tab3-consultas',
  templateUrl: './tab3-consultas.page.html',
  styleUrls: ['./tab3-consultas.page.scss'],
  standalone: false
})
export class Tab3ConsultasPage implements OnInit {
  consultas: Consulta[] = [];
  cargando = true;
  mesas : any[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private hapticService: HapticService
  ) {}

  async ngOnInit() {
    await this.cargarMesas();
  }

  async cargarConsultas() {
    this.cargando = true;
    try {
      const consultas = await this.authService.getConsultasPendientes();
      this.consultas = consultas || [];
      this.consultas.forEach(c => c.respuestaTemp = '');
    } catch (error) {
      console.error('Error al cargar consultas:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar las consultas', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async recargar() {
    await this.cargarMesas();
    this.showToast('Lista actualizada', 'medium');
  }

  async handleRefresh(event: any) {
    await this.cargarMesas();
    event.target.complete();
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    const opciones: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const hora = date.toLocaleTimeString('es-AR', opciones);

    if (date.toDateString() === hoy.toDateString()) {
      return `Hoy ${hora}`;
    } else if (date.toDateString() === ayer.toDateString()) {
      return `Ayer ${hora}`;
    } else {
      return `${date.toLocaleDateString('es-AR')} ${hora}`;
    }
  }

  test(mesa: any) {
    console.log('🔍 Mesa seleccionada completa:', mesa);
    console.log('🔍 Cliente asignado:', mesa.cliente_asignado);
    console.log('🔍 Info del cliente:', mesa.clientes);
    
    // ✅ Verificar si hay cliente (registrado o anónimo)
    if (!mesa.clientes && !mesa.cliente_asignado) {
      this.showToast('Esta mesa no tiene cliente asignado', 'warning');
      return;
    }
    
    console.log('✅ Abriendo chat para mesa:', mesa.numero);
    // Navegar al chat pasando el NUMERO de la mesa como parámetro
    this.router.navigate(['/tabs-mozo/tab3-consultas/chat', mesa.numero]);
  }

  async cargarMesas() {
    try {
      console.log('📋 Cargando TODAS las mesas...');
      
      // Obtener TODAS las mesas con su estado
      this.mesas = await this.authService.getMesasConEstado();
      
      console.log('✅ Total de mesas cargadas:', this.mesas.length);
      
      // Debug: mostrar resumen de mesas
      const mesasOcupadas = this.mesas.filter(m => m.cliente_asignado || m.clientes);
      const mesasLibres = this.mesas.filter(m => !m.cliente_asignado && !m.clientes);
      
      console.log('📊 Desglose de mesas:', {
        total: this.mesas.length,
        ocupadas: mesasOcupadas.length,
        libres: mesasLibres.length,
        registrados: mesasOcupadas.filter(m => m.clientes && !m.clientes.esAnonimo).length,
        anonimos: mesasOcupadas.filter(m => m.clientes && m.clientes.esAnonimo).length
      });
      
      // Mostrar detalle de cada mesa
      this.mesas.forEach(mesa => {
        const estado = (mesa.cliente_asignado || mesa.clientes) ? '🔴 OCUPADA' : '🟢 LIBRE';
        const cliente = mesa.clientes 
          ? `${mesa.clientes.nombre} ${mesa.clientes.esAnonimo ? '(Anónimo)' : '(Registrado)'}`
          : 'Sin cliente';
        console.log(`  Mesa ${mesa.numero}: ${estado} - ${cliente}`);
      });
      
      if (this.mesas.length > 0) {
        this.showToast(`${this.mesas.length} mesas cargadas correctamente`, 'success');
      }
    } catch (error) {
      console.error('❌ Error al cargar mesas:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar las mesas', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async loadChats(){
    // Implementar si es necesario
  }

  async verHistorial() {
    this.showToast('Función en desarrollo', 'medium');
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  hasNewMessages(numeroMesa: number): boolean {
    return false;
  }
}