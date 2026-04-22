import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';


import { HapticService } from 'src/app/services/haptic.service';
@Component({
  selector: 'app-registrar-cliente',
  templateUrl: './registrar-cliente.page.html',
  styleUrls: ['./registrar-cliente.page.scss'],
  standalone: false,
})
export class RegistrarClientePage {

  foto: string | null = null;
  registerForm: FormGroup;
  qrData: string | null = null;
  trimed: string[] | null = null;
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private hapticService: HapticService
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
    const { email, password, password2, name, surname, dni} = this.registerForm.value;

    ///////////////////
    // Validaciones //
    
    if (this.registerForm.invalid) {

      if (this.registerForm.invalid){
        this.registerForm.markAllAsTouched();

        if (Object.values(this.registerForm.value).some(value => !value)) {
          await this.hapticService.vibrateError();
          this.showToast('Complete todos los campos.', 'danger');
        }else {
          await this.mostrarErroresFormulario();
        }
      }
      return;
    }

     // Validacion de foto aparte ya que no forma parte del formGroup
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

    ///////////////////////////
    // Registro en Supabase //

    try {
      // Registrar cliente en auth
       const {data: user, error: authError } = await this.authService.registerCliente(email, password, dni)

       if (authError) {
         console.error('Error al crear cuenta Auth:', authError.message);
         await this.hapticService.vibrateError();
         this.showToast('Error al crear usuario', 'danger');
         return;
       }

       // Subir foto a storage
        const blob = this.authService.dataURLtoBlob(this.foto);
        const publicUrlData = await this.authService.subirImagenCliente(user.user?.id || '', blob); // Usar user.id como nombre de archivo
        
        if (!publicUrlData) {
          await this.hapticService.vibrateError();
          this.showToast('Error al subir la foto.', 'danger');
          return;
        }
        this.foto = publicUrlData; // Actualizar la URL de la foto con la URL pública
        
        
        const nuevoCliente = {
          nombre: name,
          apellido: surname,
          dni,
          email,
          foto: this.foto,
          user_id: user.user?.id || null
        }
        
      const data = await this.authService.insertarCliente(nuevoCliente);

      if(!data) {
        console.log(data);
        await this.hapticService.vibrateError();
        this.showToast('Error al crear el perfil de cliente.', 'danger');
        return;
      }
      this.showToast('Cliente registrado con exito.', 'success');
      

    } catch (error) {
      console.error('Error en el registro:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error en el registro. Intente nuevamente.', 'danger');
    }
  
  
  }

  async leerQR() {
    try {
      const granted = await BarcodeScanner.checkPermissions();
      if(granted.camera !== 'granted') {
        await BarcodeScanner.requestPermissions();
      }

      const result = await BarcodeScanner.scan();

      if(result.barcodes.length > 0) {
        
        this.qrData = result.barcodes[0].displayValue;
        // trimed: [1] "Apellido" [2] "Nombre" [4] "DNI"
        this.trimed = this.qrData ? this.qrData.split('@') : null;
        
        

        this.showToast('QR leído: con éxito', 'success');
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

  private async mostrarErroresFormulario() {
    for (const campo in this.registerForm.controls) {
      const control = this.registerForm.get(campo);
      if (control && control.invalid) {
        await this.hapticService.vibrateError();
        this.showToast(this.validationMessages[campo], 'danger');
        break; // solo muestra el primer error
      }
    }
  }

  

}
