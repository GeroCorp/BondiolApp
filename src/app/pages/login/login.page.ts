import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';
import { Notification } from 'src/app/services/notification';
import { HapticService } from 'src/app/services/haptic.service';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { SocialAuthService } from 'src/app/services/social-auth.service';

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
    private authService: AuthService,
    private v: HapticService,
    private tipoClienteService: TipoClienteService,
    private socialAuthService: SocialAuthService 
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async vibrate() {
    console.log('🎯 Botón de vibración presionado');
    try {
      await this.v.vibrateError();
      console.log('✅ Vibración ejecutada correctamente');
    } catch (error) {
      console.error('❌ Error en vibración:', error);
    }
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
    // ✅ CRÍTICO: Limpiar datos de cliente anónimo antes de login
    console.log('🧹 Limpiando datos de cliente anónimo previo');
    this.tipoClienteService.clearClienteData();

    const { email, password } = this.loginForm.value;
    
    // 🔍 Primero verificar si el email tiene cuenta OAuth vinculada
    const { data: clienteCheck } = await this.authService.client
      .from('clientes')
      .select('user_id, nombre')
      .eq('email', email)
      .maybeSingle();

    if (clienteCheck && !clienteCheck.user_id) {
      // Email existe pero no tiene user_id (nunca se registró con contraseña)
      await loading.dismiss();
      this.showToast(
        'Este email está registrado. Por favor usa "Continuar con Google" para iniciar sesión.',
        'warning'
      );
      return;
    }

    const { user, session } = await this.authService.login(email, password);

    if (!user) {
      await loading.dismiss();
      this.showToast('Error al obtener usuario.', 'danger');
      return;
    }

    console.log('✅ Login exitoso:', user.email);

    // Verificar si es empleado
    const empleado = await this.authService.getEmpleadoByUserId(user.id);
    
    if (Array.isArray(empleado) && empleado.length > 0) {
      // ✅ EMPLEADO
      console.log('👔 Usuario es empleado:', empleado[0].perfil);
      
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
      console.log('👤 Usuario es cliente:', {
        estado: cliente.estado,
        mesa_asignada: cliente.mesa_asignada
      });

      // ✅ CRÍTICO: Actualizar TipoClienteService con cliente REGISTRADO
      this.tipoClienteService['tipoClienteSubject'].next('registrado');
      this.tipoClienteService['clienteData'].next(cliente);

      // Verificar estado del cliente
      if (cliente.estado === 'rechazado') {
        await loading.dismiss();
        await this.authService.logout();
        this.showToast(
          'Tu cuenta fue rechazada. Contacta al administrador para más información.',
          'danger'
        );
        return;
      }
      
      if (cliente.estado === 'pendiente') {
        await loading.dismiss();
        this.router.navigate(['/pre-sala'], { replaceUrl: true });
        return;
      }
      
      if (cliente.estado === 'aprobado') {
        this.notificationService.setUserTag('cliente');
        
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

  async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning') {
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

  async irClienteAnonimo() {
    // ✅ CRÍTICO: Cerrar cualquier sesión activa antes de ir a anónimo
    console.log('🎭 Cambiando a modo anónimo');
    
    try {
      // Verificar si hay sesión activa
      const { data: { session } } = await this.authService.client.auth.getSession();
      
      if (session) {
        console.log('⚠️ Hay sesión activa, cerrando...');
        await this.authService.logout();
      }
      
      // Limpiar datos previos
      this.tipoClienteService.clearClienteData();
      
      // Navegar a ingreso anónimo
      this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
      
    } catch (error) {
      console.error('Error preparando ingreso anónimo:', error);
      this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
    }
  }

  async loginConGoogle() {
  try {
    await this.socialAuthService.loginWithGoogle();
  } catch (error) {
    console.error('Error:', error);
    this.showToast('Error al iniciar sesión', 'danger');
  }
}

}