import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AuthService } from 'src/app/services/supabase';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';
import { PerfilService } from 'src/app/services/perfilService';
import { HapticService } from 'src/app/services/haptic.service';
//Implementar loadingController

//Implementar loadingController
 
@Component({
  selector: 'app-tab1-agregar-producto',
  standalone: false,
  templateUrl: './tab1-agregar-producto.page.html',
  styleUrls: ['./tab1-agregar-producto.page.scss'],
})
export class Tab1AgregarProductoPage {

  productoForm: FormGroup;
  imagenes: any[] = [];
  perfil: string | null = null;

  constructor(
    private fb: FormBuilder, 
    private supabaseService: AuthService, 
    private router: Router, 
    private toastController: ToastController,
    private perfilService: PerfilService,
    private customLoaderService: CustomLoaderService,
    private hapticService: HapticService
  ) {
    this.perfil = this.perfilService.getPerfil();
    console.log('Perfil recibido en Tabs cocinero-bartender:', this.perfil);

    this.productoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s ]+$/), Validators.minLength(4)]],
      descripcion: ['', [Validators.required, Validators.pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s .,]+$/), Validators.minLength(10)]],
      tiempo: ['', [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.min(5), Validators.max(80)]],
      precio: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(2000), Validators.max(70000)]],
    });
  }

  async seleccionarDeGaleria() {
    if (this.imagenes.length >= 3) {
      await this.hapticService.vibrateError();
      this.showToast('Ya cargaste las 3 fotos permitidas', 'danger');
      return;
    }

    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos, // 📌 galería en vez de cámara
    });

    if (image?.dataUrl) {
      this.imagenes.push(image.dataUrl);
    }
  }

  async tomarFoto() {
    if (this.imagenes.length >= 3) {
      await this.hapticService.vibrateError();
      this.showToast('Ya cargaste las 3 fotos permitidas', 'danger');
      return;
    }

    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    if (image?.dataUrl) {
      this.imagenes.push(image.dataUrl);
    }
  }

  private normalizarTexto(texto: string): string {
    return texto
      .trim()                     // quita espacios al inicio y al final
      .replace(/\s+/g, ' ')       // reemplaza múltiples espacios por uno solo
      .toLowerCase();             // pasa todo a minúsculas
  }

  // mensajes auxiliares de validacion
  private validationMessages: { [key: string]: string } = {
    nombre: 'El nombre es obligatorio y debe tener un mínimo de 4 caracteres (sin números).',
    descripcion: 'La descripcion es obligatoria y debe tener un minimo de 10 caracteres (sin números).',
    tiempo: 'Tiempo inválido: debe ser un número mayor a 5 y menor a 80 (sin decimales).',
    precio: 'Precio inválido: debe ser un número mayor a 2000 y menor a 70 000 (máximo 2 decimales).',
  };
  // funcion auxiliar para verificacion del formulario
  private async mostrarErroresFormulario() {
    for (const campo in this.productoForm.controls) {
      const control = this.productoForm.get(campo);
      if (control && control.invalid) {
          this.customLoaderService.hide();
        await this.hapticService.vibrateError();
        this.showToast(this.validationMessages[campo], 'danger');
        break; // solo muestra el primer error
      }
    }
  }

  async crearProducto() {
    await this.customLoaderService.show('Creando producto...');
    let { nombre, descripcion, tiempo, precio } = this.productoForm.value;

    nombre = this.normalizarTexto(nombre);

    // Validacion del formulario
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched(); // fuerza validación en todos los campos

      // 1️⃣ Si hay campos vacíos
      if (Object.values(this.productoForm.value).some(val => !val)) {
          this.customLoaderService.hide();
        await this.hapticService.vibrateError();
        this.showToast('Aún faltan campos por completar.', 'danger');
      } else {
        // 2️⃣ Si están completos pero con errores (ej: precio con letras)
        await this.mostrarErroresFormulario();
      }
      return;
    }

    // Validacion de imagen aparte ya que no forma parte del formGroup
    if (this.imagenes.length < 3) {
          this.customLoaderService.hide();
      await this.hapticService.vibrateError();
      this.showToast('Debe cargar 3 fotos para completar el registro.', 'danger');
      return;
    }

    // Subir imágenes - NO modificar array original (preserva preview)
    let imagenes_posta: string[] = [];
    const bucketType = this.perfil === 'cocinero' ? 'platos' : 'bebidas';
    console.log('🔍 Perfil detectado:', this.perfil, '| Bucket:', bucketType);
    for (let img of this.imagenes) {
      const fileName = `${nombre.replace(/\s+/g, '_')}_${new Date().getTime()}.jpeg`;
      const blob = this.supabaseService.dataURLtoBlob(img);
      const publicUrl = await this.supabaseService.subirImagenPlatos(blob, fileName, bucketType);
      imagenes_posta.push(publicUrl);
    }
    try {
      // Insertar producto en Supabase Auth
      const nuevoProducto = {
        nombre: nombre,
        descripcion: descripcion,
        tiempo: tiempo,
        precio: precio,
        imagenes: imagenes_posta.join(','),
      };


      if (this.perfil === 'cocinero') {

        // Verificar existencia del plato en el menú
        const { data: existente, error: errBuscar } = await this.supabaseService.buscarPlatoPorNombre(nombre);

        if (errBuscar) {
          console.error('Error verificando plato:', errBuscar.message);
          this.customLoaderService.hide();
          await this.hapticService.vibrateError();
          this.showToast('No se pudo verificar el menú', 'danger');
          return;
        }

        if (existente && existente.length > 0) {
          this.customLoaderService.hide();
          await this.hapticService.vibrateError();
          this.showToast('El plato ya existe en la carta.', 'danger');
          return;
        }

        const { data, error } = await this.supabaseService.insertarPlato(nuevoProducto);

        if (error) {
          console.error('Error al insertar producto:', error);
          this.customLoaderService.hide();
          await this.hapticService.vibrateError();
          this.showToast('Error al guardar datos del producto', 'danger');
        } else {
          console.log('Producto creado:', data);
          this.showToast('Producto creado correctamente', 'success');
          this.productoForm.reset();
          this.imagenes = [];
        }
      } else if (this.perfil === 'bartender') {
        // Verificar existencia del plato en el menú
        const { data: existente, error: errBuscar } = await this.supabaseService.buscarBebidaPorNombre(nombre);

        if (errBuscar) {
          console.error('Error verificando plato:', errBuscar.message);
          this.customLoaderService.hide();
          await this.hapticService.vibrateError();
          this.showToast('No se pudo verificar el menú', 'danger');
          return;
        }

        if (existente && existente.length > 0) {
          this.customLoaderService.hide();
          await this.hapticService.vibrateError();
          this.showToast('El plato ya existe en la carta.', 'danger');
          return;
        }

        const { data, error } = await this.supabaseService.insertarBebida(nuevoProducto);

        if (error) {
          console.error('Error al insertar producto:', error.message);
          await this.hapticService.vibrateError();
          this.showToast('Error al guardar datos del producto', 'danger');
          this.customLoaderService.hide();
        } else {
          console.log('Producto creado:', data);
          this.showToast('Producto creado correctamente', 'success');
          this.productoForm.reset();
          this.imagenes = [];
        }
      }
      
    } catch (err: any) {
      await this.hapticService.vibrateError();
      this.customLoaderService.hide();
      this.showToast(err.message, 'danger');
    }
    this.customLoaderService.hide();


  }

  async logout() {
    await this.supabaseService.logout();

    this.router.navigate(['/login'], {replaceUrl: true}); // redirigir al login
    this.showToast('Sesión cerrada correctamente', 'medium');
  }

  resetFormulario() {
    this.productoForm.reset();  // limpia el formulario
    this.imagenes = [];         // limpia imágenes
  }

  borrarImagen(index: number) {
    this.imagenes.splice(index, 1); // elimina solo la imagen seleccionada
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
