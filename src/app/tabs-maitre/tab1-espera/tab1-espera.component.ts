import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-tab1-espera',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './tab1-espera.component.html',
  styleUrls: ['./tab1-espera.component.scss']
})
export class Tab1EsperaComponent implements OnInit {
  clientes: any[] = [];
  mesas: any[] = [];
  isLoading = false;

  constructor(
    private supabaseService: AuthService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    await this.cargarClientes();
    await this.cargarMesas();
  }

  async ionViewWillEnter() {
    await this.cargarClientes();
    await this.cargarMesas();
  }

  // 🔹 Cargar clientes anónimos en espera
  async cargarClientes() {
    this.isLoading = true;
    try {
      this.clientes = await this.supabaseService.getClientesAnonimosEnEspera();
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
    this.isLoading = false;
  }

  // 🔹 Cargar mesas disponibles
  async cargarMesas() {
    try {
      this.mesas = await this.supabaseService.getMesasDisponibles();
    } catch (err) {
      console.error('Error cargando mesas:', err);
    }
  }

  // 🔹 Asignar mesa a cliente anónimo
  async asignarMesa(cliente: any) {
    const alert = await this.alertCtrl.create({
      header: `Asignar mesa a ${cliente.nombre}`,
      inputs: this.mesas.map(mesa => ({
        name: 'mesa',
        type: 'radio',
        label: `Mesa ${mesa.numero}`,
        value: mesa.id,
        checked: false
      })),
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Asignar',
          handler: async (mesaId) => {
            if (!mesaId) return;

            try {
              await this.supabaseService.asignarMesaAClienteAnonimo(cliente.id, mesaId);

              const toast = await this.toastCtrl.create({
                message: `Mesa asignada a ${cliente.nombre}`,
                duration: 2000,
                color: 'success'
              });
              toast.present();

              await this.cargarClientes();
              await this.cargarMesas();
            } catch (err) {
              console.error('Error asignando mesa:', err);
            }
          }
        }
      ]
    });

    await alert.present();
  }
}
