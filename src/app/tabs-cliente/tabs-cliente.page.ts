import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/supabase';
import { ClienteAnonimoService } from '../services/cliente-anonimo.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tabs-cliente',
  templateUrl: './tabs-cliente.page.html',
  styleUrls: ['./tabs-cliente.page.scss'],
  standalone: false
})
export class TabsClientePage implements OnInit, OnDestroy {
  cantidadItems: number = 0;

  constructor(
    private router: Router,
    private supabase: AuthService,
    private clienteService: ClienteAnonimoService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    
    // Suscribirse a cambios en el pedido
    this.clienteService.pedido$.subscribe(pedido => {
      this.cantidadItems = pedido.reduce((sum, item) => sum + item.quantity, 0);
    });
  }

  ngOnDestroy() {
    // Limpiar al salir
    this.limpiarSesion();
  }

  private verificarSesion() {
    const cliente = sessionStorage.getItem('cliente_anonimo');
    const mesa = sessionStorage.getItem('numero_mesa');

    if (!cliente || !mesa) {
      this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
    }
  }

  async salir() {
    const alert = await this.alertCtrl.create({
      header: 'Salir',
      message: '¿Deseas salir? Perderás tu sesión y la mesa será liberada.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salir',
          handler: async () => await this.cerrarSesion()
        }
      ]
    });

    await alert.present();
  }

  private async cerrarSesion() {
    try {
      const clienteData = sessionStorage.getItem('cliente_anonimo');
      
      if (clienteData) {
        const cliente = JSON.parse(clienteData);

        // Obtener mesa asignada
        const { data } = await this.supabase.client
          .from('clientes_anonimos')
          .select('mesa_asignada')
          .eq('id_clienteanonimo', cliente.id)
          .single();

        // Liberar mesa
        if (data?.mesa_asignada) {
          await this.supabase.client
            .from('mesas')
            .update({
              cliente_asignado: null,
              disponible: true
            })
            .eq('id', data.mesa_asignada);

          // Actualizar cliente
          await this.supabase.client
            .from('clientes_anonimos')
            .update({
              mesa_asignada: null,
              en_espera: false
            })
            .eq('id_clienteanonimo', cliente.id);
        }
      }

      this.limpiarSesion();
      this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  private limpiarSesion() {
    sessionStorage.removeItem('cliente_anonimo');
    sessionStorage.removeItem('numero_mesa');
    sessionStorage.removeItem('polling_interval');
    this.clienteService.limpiarPedido();
  }
}