import { Component, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from 'src/app/services/supabase';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { SafeUrl } from '@angular/platform-browser';
import { PerfilService } from 'src/app/services/perfilService';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';
import { Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import QRCode from 'qrcode';

@Component({
  selector: 'app-tab2-carga-mesas',
  templateUrl: './tab2-carga-mesas.page.html',
  styleUrls: ['./tab2-carga-mesas.page.scss'],
  standalone: false
})
export class Tab2CargaMesasPage {

  @ViewChild('qrContainer', { static: false }) qrCodeCanvas!: ElementRef;

  mesaForm: FormGroup;
  
  email: string | null = null;
  perfil: string | null = null;
  foto: string | null = null;
  qrData: string = "";

  qrCodeDownloadLink: SafeUrl = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toast: ToastController,
    private perfilService: PerfilService,
    private customLoaderService: CustomLoaderService
  ) {
    this.perfil = this.perfilService.getPerfil();
    console.log('Perfil recibido en Tabs admin:', this.perfil);

    this.mesaForm = this.fb.group({
      numero: ['', [Validators.required, Validators.min(1), Validators.max(100)]],
      capacidad: ['', [Validators.required, Validators.min(1), Validators.max(30)]],
      tipo: ['', Validators.required],
      foto: [null, Validators.required]

    });
  }



  private validatorsMessages: { [key: string]: string } = {
    numero: 'El número de mesa es obligatorio.',
    capacidad: 'La capacidad debe estar entre 1 y 30 personas.',
    tipo: 'Debe seleccionar tipo de mesa.',
    foto: 'Debe tomar una foto de la mesa.'

  };

  async showToast(message: string, color: 'success' | 'danger' | 'medium') {
    const toast = await this.toast.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  private handleErrors() {
    for (const field in this.mesaForm.controls) {
      const control = this.mesaForm.get(field);
      if (control && control.invalid) {
        this.showToast(this.validatorsMessages[field], 'danger');
        break;
      }
    }
  }

  // Obtener URL del QR generado
  onQrCodeUrl(url: SafeUrl) {
    console.log('URL del QR generado:', url.toString()); 
    this.qrCodeDownloadLink = url;
  }



  generateQR () {
    const {numero, capacidad, tipo} = this.mesaForm.value;

    // Verificar que los campos necesarios estén completos
    if (numero && capacidad && tipo) {
      const payload = [numero,capacidad,tipo];
      this.qrData = payload.join(",");
    }else {
      this.showToast('Completar todos los campos para generar el QR', 'danger');
      throw new Error('Faltan campos para generar el QR');
    }
    console.log('Datos de la mesa para QR:', this.qrData);
  }



  async onSubmit(){

    this.generateQR()

    await this.customLoaderService.show('Creando mesa...');
    if (!this.mesaForm.valid) {
      this.mesaForm.markAllAsTouched();

      // Verificar campos vacios
      if (Object.values(this.mesaForm.controls).some(control => control.invalid)) {
        this.showToast('Completar todos los campos', 'danger');
        
      } else {
        // De no haber campos vacios, verificar otros errores
        this.handleErrors();
        this.customLoaderService.hide();
      }
      return;
    }

      const { numero, capacidad, tipo,foto } = this.mesaForm.value;
      if (!this.qrData) {
        this.showToast('Generar el QR antes de crear la mesa', 'danger');
        this.customLoaderService.hide();
        throw new Error('QR no generado');
      }
      // Obtener la imagen del QR en base64 desde la bd
      const qrBlob = await this.getQRBlob();
        if (!qrBlob) {
          this.showToast('Error generando el QR', 'danger');
          this.customLoaderService.hide();
          return;
        }
      const qrUrl = await this.authService.subirQRmesa(numero, qrBlob!);
      
    
      const fotoBlob = this.authService.dataURLtoBlob(foto);
      const fotoUrl = await this.authService.subirImagenMesa(numero, fotoBlob);

    
      
      const mesaData ={
        numero,
        capacidad,
        tipo,
        qr_url: qrUrl,
        foto_url: fotoUrl,
      }
      console.log('Datos de la mesa a crear:', mesaData);

    try {
      const { data, error } = await this.authService.
      insertarMesa(mesaData);
      
      if (error) {
        throw new Error(error.message);
      }
      console.log(data);
      this.showToast('Mesa creada correctamente', 'success');
      this.mesaForm.reset();
      this.qrData = "";
      

    }catch (e){
      this.showToast('Error al crear mesa', 'danger');
        this.customLoaderService.hide();
      console.error(e);
    }finally {
      this.mesaForm.reset();
      this.qrData = "";
      this.qrCodeDownloadLink = '';
      this.customLoaderService.hide();
    }
    
    this.customLoaderService.hide();
    
  }

  async downloadQRCode() {
    const qrBlob = await  this.getQRBlob();
    if (!qrBlob) {
      this.showToast('No se pudo descargar el QR', 'danger');
      return;
    }
    const url = URL.createObjectURL(qrBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mesa_${this.mesaForm.value.numero}_qrcode.jpg`;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async getQRBlob(): Promise<Blob | null> {
  if (!this.qrData) return null;

  try {
    // Genera el QR como Data URL (base64 PNG)
    const dataUrl = await QRCode.toDataURL(this.qrData, {
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    return this.authService.dataURLtoBlob(dataUrl);
  } catch (e) {
    console.error('Error generando QR:', e);
    return null;
  }
}

  async tomarFoto() {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });

    this.mesaForm.patchValue({
    foto: image.dataUrl 
  })     
  }
}
