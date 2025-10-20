import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';
import { Notification } from 'src/app/services/notification';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  loginForm: FormGroup;
  passwordVisible = false;
  private notificationService: Notification = inject(Notification);

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  cambiarVisibilidadPassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  async onLogin() {
    if (this.loginForm.invalid) {
      this.showToast('Por favor, complete todos los campos correctamente.', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...'
    });
    await loading.present();

    try {
      const { email, password } = this.loginForm.value;
      const { user, session } = await this.authService.login(email, password);

      if (!user) {
        await loading.dismiss();
        this.showToast('Error al obtener usuario.', 'danger');
        return;
      }

      // Verificar si es empleado
      const empleado = await this.authService.getEmpleadoByUserId(user.id);
      
      if (Array.isArray(empleado) && empleado.length > 0) {
        // ✅ Es empleado -> establecer tags y redirigir a home de empleados
        this.notificationService.setUserTag(empleado[0].perfil);
        this.notificationService.setExternalUserId(user.id);
        
        await loading.dismiss();
        this.router.navigate(['/home'], {
          replaceUrl: true,
          state: {
            email: user.email,
            perfil: empleado[0].perfil
          }
        });
        this.showToast(`Bienvenido ${empleado[0].nombre}`, 'success');
        return;
      }

      // Verificar si es cliente
      const cliente = await this.authService.getClienteByUserId(user.id);
      
      if (cliente) {
        // Verificar estado del cliente
        if (cliente.estado === 'rechazado') {
          // ❌ Cliente rechazado - no puede acceder
          await loading.dismiss();
          await this.authService.logout();
          this.showToast(
            'Tu cuenta fue rechazada. Contacta al administrador para más información.',
            'danger'
          );
          return;
        }
        
        if (cliente.estado === 'pendiente') {
          // ⏳ Cliente pendiente - redirigir a pre-sala
          await loading.dismiss();
          this.router.navigate(['/pre-sala'], { replaceUrl: true });
          return;
        }
        
        if (cliente.estado === 'aprobado') {
          // ✅ Cliente aprobado - establecer tags y redirigir a homeCliente
          this.notificationService.setUserTag('cliente');
          this.notificationService.setExternalUserId(user.id);
          
          await loading.dismiss();
          this.router.navigate(['/home-cliente'], { replaceUrl: true });
          this.showToast(`¡Bienvenido/a ${cliente.nombre}!`, 'success');
          return;
        }
      }

      // Si no es ni empleado ni cliente
      await loading.dismiss();
      this.showToast('Usuario no registrado correctamente.', 'danger');
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error en login:', error);
      this.showToast('Error al iniciar sesión: ' + (error.message || error), 'danger');
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
      
      case "cliente":
        email = "juanjo@mail.com"
        password = "123123"
        break;
    
    }

    this.loginForm.setValue({email, password});
  }

  irClienteAnonimo() {
    this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
  }
}
