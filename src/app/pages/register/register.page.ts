import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage {

  foto: string | null = null;
  registerForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private authService: AuthService
  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', Validators.required, Validators.minLength(4), Validators.pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)],
      surname: ['', Validators.required, Validators.minLength(4), Validators.pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)],
      dni: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(8), Validators.pattern(/^[0-9]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password2: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  
  async onRegister() {
    const { email, password, password2, ...resto } = this.registerForm.value;

    ///////////////////
    // Validaciones //
    
    if (this.registerForm.invalid) {

      if (this.registerForm.invalid){
        this.registerForm.markAllAsTouched();

        if (Object.values(this.registerForm.value).some(value => !value)) {
          this.showToast('Complete todos los campos.', 'danger');
        }else {
          this.mostrarErroresFormulario();
        }
      }
      return;
    }

     // Validacion de foto aparte ya que no forma parte del formGroup
    if (!this.foto) {
      this.showToast('Debe tomarse una foto para completar el registro.', 'danger');
      return;
    }

    if (password !== password2) {
      this.showToast('Las contraseñas no coinciden.', 'danger');
      return;
    }

    ///////////////////////////
    // Registro en Supabase //

    try {
      const {data: user, error: authError } = await this.authService.registerCliente(email, password);

      if (authError) {
        console.error('Error al crear cuenta Auth:', authError.message);
        this.showToast('Error al crear usuario', 'danger');
        return;
      }

      const nuevoCliente = {
        ...resto,          // nombre, apellido, dni
        email,
        foto: this.foto,
        user_id: user.user?.id
      }

      const [error] = await this.authService.insertarCliente(nuevoCliente);

      if (error) {
        console.error('Error al insertar cliente:', error.message);
        this.showToast('Error al completar registro. Intente nuevamente.', 'danger');
        return;
      } else {
        console.log('Cliente creado:', nuevoCliente);
        this.showToast('Registro exitoso', 'success');
        this.registerForm.reset();
        this.foto = null;
      }

    } catch (error) {
      console.error('Error en el registro:', error);
      this.showToast('Error en el registro. Intente nuevamente.', 'danger');
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

  async tomarFoto() {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });
    this.foto = image.dataUrl!;
  }

  // mensajes auxiliares de validacion
  private validationMessages: { [key: string]: string } = {
    nombre: 'El nombre es obligatorio y debe tener un mínimo de 4 caracteres (sin números).',
    apellido: 'El apellido es obligatorio y debe tener un mínimo de 4 caracteres (sin números).',
    dni: 'DNI inválido: debe tener 8 dígitos numéricos.',
    clave: 'Contraseña inválida: mínimo 6 caracteres.',
    email: 'Correo electrónico inválido.'
  };

  private mostrarErroresFormulario() {
    for (const campo in this.registerForm.controls) {
      const control = this.registerForm.get(campo);
      if (control && control.invalid) {
        this.showToast(this.validationMessages[campo], 'danger');
        break; // solo muestra el primer error
      }
    }
  }

}
