import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingCtrl: LoadingController
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async onLogin() {
    if (this.loginForm.invalid) {
      this.showToast('Complete todos los campos correctamente.', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Ingresando...',
      spinner: 'crescent',
    });
    await loading.present();

    const { email, password } = this.loginForm.value;

    try {
      // 1️⃣ Login en Supabase
      const data = await this.authService.login(email, password);
      const userId = data.user!.id;

      // 2️⃣ Consulto perfil en empleados
      let perfil: string | null = null;
      const empleados = await this.authService.getEmpleadoByUserId(userId);

      if (Array.isArray(empleados) && empleados.length > 0) {
        perfil = empleados[0].perfil;
      } else {
        perfil = 'sin-perfil';
      }

      await loading.dismiss();

      // 3️⃣ Navego al home
      this.router.navigate(['/home'], { state: { email, perfil } });

      this.showToast('¡Bienvenido/a!', 'success');
    } catch (err: any) {
      await loading.dismiss();
      this.showToast(err.message, 'danger');
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
