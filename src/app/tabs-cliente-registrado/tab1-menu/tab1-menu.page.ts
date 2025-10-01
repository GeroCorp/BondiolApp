import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/supabase';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-tab1-menu',
  templateUrl: './tab1-menu.page.html',
  styleUrls: ['./tab1-menu.page.scss'],
  standalone: false,
})
export class Tab1MenuPage implements OnInit {
  nroMesa: number = 0;
  platos: any[] = [];
  bebidas: any[] = [];
  itemSelected: any = null;
  constructor(
    private authService: AuthService,
    private toastController: ToastController
  ) { 
  }

  async ngOnInit() {
    await this.cargarPlatos();
    await this.cargarBebidas();
  }
  async escanearQr() {
    try {
      const granted = await BarcodeScanner.checkPermissions();
      if (granted.camera !== 'granted') {
        await BarcodeScanner.requestPermissions();
      }  
      
      const result = await BarcodeScanner.scan();

      console.log(result);
      if (result.barcodes) {
        try {
            const barcode = result.barcodes[0].displayValue;
           
            const nro = barcode ? parseInt(barcode) : null;

            this.nroMesa = nro ? nro : 0;
            this.cargarPlatos();
            this.cargarBebidas();
            this.showToast('Datos cargados desde QR', 'success');
          } catch (e) {
            console.error('Error al parsear QR:', e);
            this.showToast('El QR no contiene datos válidos', 'danger');
          } 
      } else {
        this.showToast('No se detectó ningún QR', 'danger');
      }
    } catch (err: any) {
      console.error('Error al escanear QR:', err);
      this.showToast(err.message, 'danger');
    }
  }

  async cargarPlatos(){
    this.platos = await this.authService.getPlatos();
    if (this.platos.length > 0) {
      this.showToast('Platos cargados', 'success');
    } else {
      this.showToast('No se encontraron platos', 'medium');
    }
  }

  async cargarBebidas(){
    this.bebidas = await this.authService.getBebidas();
    if (this.bebidas.length > 0) {
      this.showToast('Bebidas cargadas', 'success');
    } else {
      this.showToast('No se encontraron bebidas', 'medium');
    }
  }

  // handleImages(item: any){
  //   const imgArray = item.imagenes.split(',');
  //   item.imagenes = imgArray;
  //   return item.imagenes[0];
  // }

  seleccionarItem(item:any){
    this.itemSelected = item;
    console.log(this.itemSelected);
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
