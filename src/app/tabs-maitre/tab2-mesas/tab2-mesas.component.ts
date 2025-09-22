import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-tab2-mesas',
  imports: [CommonModule, IonicModule],
  templateUrl: './tab2-mesas.component.html',
  styleUrls: ['./tab2-mesas.component.scss'],
})
export class Tab2MesasComponent implements OnInit {
  mesas: any[] = [];
  isLoading = false;

  constructor(
    private supabaseService: AuthService,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    await this.cargarMesas();
  }

  async ionViewWillEnter() {
    await this.cargarMesas();
  }

  async cargarMesas() {
    this.isLoading = true;
    try {
      this.mesas = await this.supabaseService.getMesasDisponibles();
    } catch (err) {
      console.error('Error cargando mesas:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async liberarMesa(mesa: any) {
    try {
      await this.supabaseService.liberarMesa(mesa.id);

      const toast = await this.toastCtrl.create({
        message: `Mesa ${mesa.numero} liberada`,
        duration: 2000,
        color: 'success',
      });
      toast.present();

      await this.cargarMesas();
    } catch (err) {
      console.error('Error liberando mesa:', err);
    }
  }
}
