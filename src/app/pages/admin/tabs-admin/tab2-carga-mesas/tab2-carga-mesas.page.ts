import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/supabase';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { SafeUrl } from '@angular/platform-browser';


@Component({
  selector: 'app-tab2-carga-mesas',
  templateUrl: './tab2-carga-mesas.page.html',
  styleUrls: ['./tab2-carga-mesas.page.scss'],
  standalone: false
})
export class Tab2CargaMesasPage {

  mesaForm: FormGroup;

  email: string | null = null;
  perfil: string | null = null;

  qrData: string = '';

  qrCodeDownloadLink: SafeUrl = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toast: ToastController,
  ) {
    this.email = history.state['email'] ?? null;
    this.perfil = history.state['perfil'] ?? null;
    console.log('Perfil recibido en tabs:', this.perfil);

    this.mesaForm = this.fb.group({
      numero: ['', Validators.required],
      capacidad: ['', Validators.required],
      tipo: ['', Validators.required]
      // qr_url: ['', Validators.required]

    });
  }

  // No se usa por ahora
  // volverHome() {
  //   this.router.navigate(['/home'], { state: {email: this.email, perfil: this.perfil}, replaceUrl: true });
  // }


  private validatorsMessages: { [key: string]: string } = {
    numero: 'El número de mesa es obligatorio.',
    capacidad: 'La capacidad debe estar entre 1 y 20 personas.',
    tipo: 'Debe seleccionar tipo de mesa.',
    // qr_url: 'El URL del QR es obligatorio.'
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

    ////// NO DESCOMENTAR PQ NO FUNCA Y NO SÉ POR QUÉ AAAAAAAAAAAAAAAAAAAAAA
    // Actualizar el campo qr_url en el formulario con el URL del QR generado
    // this.mesaForm.patchValue({ qr_url: url.toString() });
  }



  generateQR () {
    const {numero, capacidad, tipo } = this.mesaForm.value;

    // Verificar que los campos necesarios estén completos
    if (numero && capacidad && tipo) {
      const payload = { numero, capacidad, tipo };
      this.qrData = JSON.stringify(payload);
    
    
    }
    console.log('Datos de la mesa para QR:', this.qrData);

  }


  async onSubmit(){

    if (!this.mesaForm.valid) {
      this.mesaForm.markAllAsTouched();

      // Verificar campos vacios
      if (Object.values(this.mesaForm.controls).some(control => control.invalid)) {
        this.showToast('Completar todos los campos', 'danger');
        
      } else {
        // De no haber campos vacios, verificar otros errores
        this.handleErrors();
      }
      return;
    }

    if (this.mesaForm.valid) {

      const mesaData = this.mesaForm.value;
      console.log('Datos de la mesa a crear:', mesaData);

      try {
        const { data, error } = await this.authService.
        insertarMesa(mesaData);
        if (!error) {
          this.showToast('Mesa creada correctamente', 'success');
          this.mesaForm.reset();
          this.qrData = "";
        }

      }catch (e){
        this.showToast('Error al crear mesa', 'danger');
        console.error(e);
      }

    }
  }

}
