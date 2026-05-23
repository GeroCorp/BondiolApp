import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { HapticService } from 'src/app/services/haptic.service';

@Component({
  selector: 'app-tab3-clientes',
  templateUrl: './tab3-clientes.page.html',
  styleUrls: ['./tab3-clientes.page.scss'],
  standalone: false,
})
export class Tab3ClientesPage {

  foto: string | null = null;
  registerForm: FormGroup;
  qrData: string | null = null;
  trimed: string[] | null = null;
  passwordVisible = false;
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private hapticService: HapticService
  ) {
    this.registerForm = this.formBuilder.group({
      name:     ['', [Validators.required, Validators.minLength(4), Validators.pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)]],
      surname:  ['', [Validators.required, Validators.minLength(4), Validators.pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)]],
      dni:      ['', [Validators.required, Validators.minLength(7), Validators.maxLength(8), Validators.pattern(/^[0-9]+$/)]],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password2:['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onRegister() {
    const { email, password, password2, name, surname, dni } = this.registerForm.value;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      if (Object.values(this.registerForm.value).some(value => !value)) {
        await this.hapticService.vibrateError();
        this.showToast('Complete todos los campos.', 'danger');
      } else {
        await this.mostrarErroresFormulario();
      }
      return;
    }

    if (!this.foto) {
      await this.hapticService.vibrateError();
      this.showToast('Debe tomarse una foto para completar el registro.', 'danger');
      return;
    }

    if (password !== password2) {
      await this.hapticService.vibrateError();
      this.showToast('Las contraseñas no coinciden.', 'danger');
      return;
    }

    try {
      const { data: user, error: authError } = await this.authService.registerCliente(email, password, dni);

      if (authError) {
        console.error('Error al crear cuenta Auth:', authError.message);
        await this.hapticService.vibrateError();
        this.showToast('Error al crear usuario', 'danger');
        return;
      }

      const blob = this.authService.dataURLtoBlob(this.foto);
      const publicUrlData = await this.authService.subirImagenCliente(user.user?.id || '', blob);

      if (!publicUrlData) {
        await this.hapticService.vibrateError();
        this.showToast('Error al subir la foto.', 'danger');
        return;
      }
      this.foto = publicUrlData;

      const nuevoCliente = {
        nombre: name,
        apellido: surname,
        dni,
        email,
        foto: this.foto,
        user_id: user.user?.id || null
      };

      const data = await this.authService.insertarCliente(nuevoCliente);

      if (!data) {
        await this.hapticService.vibrateError();
        this.showToast('Error al crear el perfil de cliente.', 'danger');
        return;
      }

      this.showToast('Cliente registrado con éxito.', 'success');
      this.registerForm.reset();
      this.foto = null;
      this.qrData = null;
      this.trimed = null;

    } catch (error) {
      console.error('Error en el registro:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error en el registro. Intente nuevamente.', 'danger');
    }
  }

   cambiarVisibilidadPassword() {
    this.passwordVisible = !this.passwordVisible;
  }
  async leerQR() {
    try {
      const granted = await BarcodeScanner.checkPermissions();
      if (granted.camera !== 'granted') {
        await BarcodeScanner.requestPermissions();
      }

      const result = await BarcodeScanner.scan();

      if (result.barcodes.length > 0) {
        this.qrData = result.barcodes[0].displayValue;
        // trimed: [1] Apellido  [2] Nombre  [4] DNI
        this.trimed = this.qrData ? this.qrData.split('@') : null;

        // Poblar el formulario con los datos del QR
        if (this.trimed) {
          this.registerForm.patchValue({
            name:    this.trimed[2] ?? '',
            surname: this.trimed[1] ?? '',
            dni:     this.trimed[4] ?? '',
          });
        }

        this.showToast('QR leído con éxito', 'success');
      }
    } catch (error) {
      console.error('Error al leer el QR:', error);
    }
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

  async showToast(message: string, color: 'success' | 'danger' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  private validationMessages: { [key: string]: string } = {
    name:     'El nombre es obligatorio y debe tener mínimo 4 caracteres (sin números).',
    surname:  'El apellido es obligatorio y debe tener mínimo 4 caracteres (sin números).',
    dni:      'DNI inválido: debe tener entre 7 y 8 dígitos numéricos.',
    password: 'Contraseña inválida: mínimo 6 caracteres.',
    email:    'Correo electrónico inválido.'
  };

  private async mostrarErroresFormulario() {
    for (const campo in this.registerForm.controls) {
      const control = this.registerForm.get(campo);
      if (control && control.invalid) {
        await this.hapticService.vibrateError();
        this.showToast(this.validationMessages[campo] ?? `Campo "${campo}" inválido.`, 'danger');
        break;
      }
    }
  }
}