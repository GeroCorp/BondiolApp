import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';
import { Notification } from 'src/app/services/notification';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage {
  foto: string | null = null;
  registerForm: FormGroup;
  qrData: string | null = null;
  trimed: string[] | null = null;
  passwordVisible = false;
  
  private notificationService: Notification = inject(Notification);

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private authService: AuthService
  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(4), Validators.pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)]],
      surname: ['', [Validators.required, Validators.minLength(4), Validators.pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)]],
      dni: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(8), Validators.pattern(/^[0-9]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password2: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  
  cambiarVisibilidadPassword() {
    this.passwordVisible = !this.passwordVisible;
  }
  
  async onRegister() {
    const { email, password, password2, name, surname, dni } = this.registerForm.value;

    // Validaciones
    if (this.registerForm.invalid) {
      if (this.registerForm.invalid) {
        this.registerForm.markAllAsTouched();

        if (Object.values(this.registerForm.value).some(value => !value)) {
          this.showToast('Complete todos los campos.', 'danger');
        } else {
          this.mostrarErroresFormulario();
        }
      }
      return;
    }

    // Validación de foto
    if (!this.foto) {
      this.showToast('Debe tomarse una foto para completar el registro.', 'danger');
      return;
    }

    if (password !== password2) {
      this.showToast('Las contraseñas no coinciden.', 'danger');
      return;
    }

    // Mostrar loading
    const loading = await this.loadingController.create({
      message: 'Registrando...'
    });
    await loading.present();

    try {
      // 1. Crear usuario en Auth
      const { data: user, error: authError } = await this.authService.registerCliente(email, password);

      if (authError) {
        await loading.dismiss();
        console.error('Error al crear cuenta Auth:', authError.message);
        this.showToast('Error al crear usuario', 'danger');
        return;
      }

      // 2. Subir foto a storage
      const blob = this.authService.dataURLtoBlob(this.foto);
      const publicUrlData = await this.authService.subirImagenCliente(user.user?.id || '', blob);
      
      if (!publicUrlData) {
        await loading.dismiss();
        this.showToast('Error al subir la foto.', 'danger');
        return;
      }
      this.foto = publicUrlData;

      const publicUrl = await this.authService.subirImagenCliente(user.user?.id || '', blob);

      const nuevoCliente = {
        nombre: name,
        apellido: surname,
        dni,
        email,
        foto: publicUrl,   // 👉 guardás la URL pública
        user_id: user.user?.id || null
      };

      const data = await this.authService.insertarCliente(nuevoCliente);

      if (!data) {
        await loading.dismiss();
        console.log(data);
        this.showToast('Error al crear el perfil de cliente.', 'danger');
        return;
      }

      // 4. Enviar notificación push a dueños y supervisores
      try {
        const notificationSent = await this.notificationService.sendNotificationToAdmins(
          '🔔 Nuevo Cliente Registrado',
          `${name} ${surname} se ha registrado y está pendiente de aprobación.`,
          '/tabs-admin/tab3-admin-cliente'
        );

        if (notificationSent) {
          console.log('✅ Notificación push enviada a administradores');
        } else {
          console.warn('⚠️ No se pudo enviar la notificación push');
        }
      } catch (notifError) {
        console.error('Error al enviar notificación push:', notifError);
        // No detenemos el registro por un error en la notificación
      }

      await loading.dismiss();
      this.showToast('Espere la confirmación de registro por mail.', 'success');
      this.router.navigate(['/login'], { replaceUrl: true });

    } catch (error) {
      await loading.dismiss();
      console.error('Error en el registro:', error);
      this.showToast('Error en el registro. Intente nuevamente.', 'danger');
    }
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
        // trimed: [1] "Apellido" [2] "Nombre" [4] "DNI"
        this.trimed = this.qrData ? this.qrData.split('@') : null;

        this.showToast('QR leído con éxito', 'success');
        console.log(this.qrData);
      }
    } catch (error) {
      console.error('Error al leer el QR:', error);
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
    this.foto = image.dataUrl!;       // base64 para subir
  }


  // Mensajes auxiliares de validación
  private validationMessages: { [key: string]: string } = {
    name: 'El nombre es obligatorio y debe tener un mínimo de 4 caracteres (sin números).',
    surname: 'El apellido es obligatorio y debe tener un mínimo de 4 caracteres (sin números).',
    dni: 'DNI inválido: debe tener 7-8 dígitos numéricos.',
    password: 'Contraseña inválida: mínimo 6 caracteres.',
    email: 'Correo electrónico inválido.'
  };

  private mostrarErroresFormulario() {
    for (const campo in this.registerForm.controls) {
      const control = this.registerForm.get(campo);
      if (control && control.invalid) {
        this.showToast(this.validationMessages[campo], 'danger');
        break;
      }
    }
  }

  volverLogin(){
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}