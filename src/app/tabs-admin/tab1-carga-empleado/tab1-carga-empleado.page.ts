import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AuthService } from 'src/app/services/supabase';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';


import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { PerfilService } from 'src/app/services/perfilService';


@Component({
  selector: 'app-tab1-carga-empleado',
  templateUrl: './tab1-carga-empleado.page.html',
  styleUrls: ['./tab1-carga-empleado.page.scss'],
  standalone: false
})
export class Tab1CargaEmpleadoPage {
  empleadoForm: FormGroup;
  foto: string | null = null;
  perfil: string | null = null;

  constructor (
    private fb: FormBuilder, 
    private supabaseService: AuthService, 
    private router: Router, 
    private toastController: ToastController,
    private perfilService: PerfilService
    // private loadingCtrl: LoadingController // implementarlo
  ) {
    this.perfil = this.perfilService.getPerfil();
    console.log('Perfil recibido en Tabs admin:', this.perfil);

    this.empleadoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/), Validators.minLength(4)]], 
      apellido: ['', [Validators.required, Validators.pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/), Validators.minLength(4)]],
      dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      cuil: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
      email: ['', [Validators.required, Validators.email]],
      clave: ['', [Validators.required, Validators.minLength(6)]],
      perfil: ['', Validators.required],
    });
  }

  async tomarFoto() {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    this.foto = image.dataUrl!;
  }

  // mensajes auxiliares de validacion
  private validationMessages: { [key: string]: string } = {
    nombre: 'El nombre es obligatorio y debe tener un mínimo de 4 caracteres (sin números).',
    apellido: 'El apellido es obligatorio y debe tener un mínimo de 4 caracteres (sin números).',
    dni: 'DNI inválido: debe tener 8 dígitos numéricos.',
    cuil: 'CUIL inválido: debe tener 11 dígitos numéricos.',
    clave: 'Contraseña inválida: mínimo 6 caracteres.',
    email: 'Correo electrónico inválido.',
    perfil: 'Debe seleccionar un perfil.',
  };
  // funcion auxiliar para verificacion del formulario
  private mostrarErroresFormulario() {
    for (const campo in this.empleadoForm.controls) {
      const control = this.empleadoForm.get(campo);
      if (control && control.invalid) {
        this.showToast(this.validationMessages[campo], 'danger');
        break; // solo muestra el primer error
      }
    }
  }

  async crearEmpleado() {
    const { email, clave, perfil, ...resto } = this.empleadoForm.value;

    // Bloquear dueño/supervisor
    if (perfil === 'dueño' || perfil === 'supervisor') {
      this.showToast('No se pueden crear más dueños o supervisores', 'danger');
      return;
    }

    // Validacion del formulario
    if (this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched(); // fuerza validación en todos los campos

      // 1️⃣ Si hay campos vacíos
      if (Object.values(this.empleadoForm.value).some(val => !val)) {
        this.showToast('Aún faltan campos por completar.', 'danger');
      } else {
        // 2️⃣ Si están completos pero con errores (ej: DNI con letras)
        this.mostrarErroresFormulario();
      }
      return;
    }

    // Validacion de foto aparte ya que no forma parte del formGroup
    if (!this.foto) {
      this.showToast('Debe tomarse una foto para completar el registro.', 'danger');
      return;
    }

    try {
      // 1️⃣ Crear cuenta en Supabase Auth
      const { data: user, error: authError } = await this.supabaseService.registrarEmpleado(email, clave);

      if (authError) {
        console.error('Error al crear cuenta Auth:', authError.message);
        this.showToast('Error al crear usuario', 'danger');
        return;
      }

      // 2️⃣ Insertar datos en empleados (sin clave)
      const nuevoEmpleado = {
        ...resto,          // nombre, apellido, dni, cuil
        email,
        perfil,
        foto: this.foto,
        user_id: user.user?.id, // relacionar con Auth
      };

      const { data, error } = await this.supabaseService.insertarEmpleado(nuevoEmpleado);

      if (error) {
      console.error('Error al insertar en empleados:', error.message);
      this.showToast('Error al guardar datos del empleado', 'danger');
      } else {
        console.log('Empleado creado:', data);
        this.showToast('Empleado creado correctamente', 'success');
        this.empleadoForm.reset();
        this.foto = null;
      }

    } catch (err: any) {
      this.showToast(err.message, 'danger');
    }

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

  // QR
  async leerQR() {
    try {
      // Solicitar permisos de cámara
      const granted = await BarcodeScanner.checkPermissions();
      if (granted.camera !== 'granted') {
        await BarcodeScanner.requestPermissions();
      }

      // Escaneo único (más confiable)
      const result = await BarcodeScanner.scan();

      if (result.barcodes.length > 0) {
        try {
          const barcode = result.barcodes[0];
          const contenido = barcode.rawValue ?? barcode.displayValue ?? '';

          if (!contenido) throw new Error('QR vacío');

          const datos = JSON.parse(contenido);

          this.empleadoForm.patchValue({
            nombre: datos.nombre ?? '',
            apellido: datos.apellido ?? '',
            dni: datos.dni ?? '',
            cuil: datos.cuil ?? ''
          });

          this.showToast('Datos cargados desde QR', 'success');
        } catch (e) {
          console.error('Error al parsear QR:', e);
          this.showToast('El QR no contiene datos válidos', 'danger');
        }
      } else {
        this.showToast('No se detectó ningún QR', 'danger');
      }

    } catch (err) {
      console.error(err);
      this.showToast('No se pudo iniciar el escaneo', 'danger');
    }
  }

}

