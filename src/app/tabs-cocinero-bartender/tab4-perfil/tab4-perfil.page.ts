import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { PerfilService } from 'src/app/services/perfilService';
import { AuthService } from 'src/app/services/supabase';

import { HapticService } from 'src/app/services/haptic.service';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';
interface Empleado {
  id_empleado?: number;
  user_id?: string;
  nombre: string;
  apellido: string;
  dni?: string;
  cuil?: string;
  email?: string | null;
  perfil?: string;
  foto?: string;
  created_at?: string;
}

@Component({
  selector: 'app-tab4-perfil',
  templateUrl: './tab4-perfil.page.html',
  styleUrls: ['./tab4-perfil.page.scss'],
  standalone: false
})
export class Tab4PerfilPage implements OnInit {

  perfil: any;
  empleadoPerfil: Empleado[] = [];
  empleado: Empleado | null = null;
  
  constructor(
    private supabaseService: AuthService,
    private perfilService: PerfilService,
    private router: Router,
    private toastController: ToastController,
    private customLoader: CustomLoaderService,
    private hapticService: HapticService
  ) { 
    this.perfil = this.perfilService.getPerfil();
    console.log('Perfil recibido en Tab4 Cocinero/Bartender:', this.perfil);
  }

  ngOnInit(): void {
    this.cargarPerfilEmpleado();
  }

  async cargarPerfilEmpleado() {
    await this.customLoader.show('Cargando perfil');
    
    try {
      this.empleado = await this.supabaseService.cargarEmpleado();
    } catch (err: any) {
      console.error('Error cargando empleado:', err);
      await this.hapticService.vibrateError();
      await this.showToast('Error cargando empleado: ' + (err.message ?? err), 'danger');
    } finally {
      await this.customLoader.hide();
    }
  }

  async logout() {
    await this.supabaseService.logout();

    this.router.navigate(['/login'], {replaceUrl: true});
    this.showToast('Sesión cerrada correctamente', 'medium');
  }

  async showToast(message: string, color: 'success' | 'danger' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2700,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

}
