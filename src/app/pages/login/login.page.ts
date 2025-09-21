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
  passwordVisible = false;
  
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

  cambiarVisibilidadPassword() {
    this.passwordVisible = !this.passwordVisible;
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
      console.log('Buscando empleados con userId:', userId);
      const empleados = await this.authService.getEmpleadoByUserId(userId);
      console.log('Empleados devueltos:', empleados);

      console.log('UserId:', userId);
      console.log('Empleados devueltos:', empleados);

      if (Array.isArray(empleados) && empleados.length > 0) {
        perfil = empleados[0].perfil;
      } else {
        perfil = 'sin-perfil';
      }

      await loading.dismiss();

      // 3️⃣ Navego según el perfil
      // no descomentar
      // if (perfil === 'dueño' || perfil === 'supervisor') {
      //   this.router.navigate(['/tabs-admin'], { state: { perfil }, replaceUrl: true });
      // } else {
        this.router.navigate(['/home'], { state: { email, perfil }, replaceUrl: true });
      // }

      this.showToast('¡Bienvenido/a!', 'success');
    } catch (err: any) {
      await loading.dismiss();
      this.showToast(err.message, 'danger');
    }
  }

  ingresarARegistro() {
    this.router.navigate(['/registro'], {replaceUrl: true });
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

  registrar() {
    this.router.navigate(['/register'], { replaceUrl: true });
  }


  // Rellena el formulario con los datos predefinidos (Intente hacerlo con auth, pero no existe mejor manera que hardcodear)

  fastFill(perfil: string){
    let email = "";
    let password = "";
    switch(perfil){
      case "dueño":
        email = "dueno@resto-admin.com"
        password = "admin123"
        break;

      case "supervisor":
        email = "supervisor@resto-admin.com"
        password = "super123"
        break;
      
      case "maitre":
        email = "maitre@resto-empleado.com"
        password = "maitre123"
        break;

      case "mozo" :
        email = "mozo@resto-empleado.com"
        password = "mozo123"
        break;

      case "cocinero": 
        email = "cocinero@resto-empleado.com"
        password = "cocinero123"
        break;

        case "bartender":
          email = "bartender@resto-empleado.com"
          password = "bartender123"
          break;
    
    }

    this.loginForm.setValue({email, password});
  }
}
