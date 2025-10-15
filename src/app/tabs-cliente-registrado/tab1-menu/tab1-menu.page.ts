import { Component, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/supabase';
import { ClienteService } from '../../services/cliente.service';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

interface Item {
  id: number;
  nombre: string;
  precio: number;
  tipo: 'plato' | 'bebida';
}

@Component({
  selector: 'app-tab1-menu',
  templateUrl: './tab1-menu.page.html',
  styleUrls: ['./tab1-menu.page.scss'],
  standalone: false,
})
export class Tab1MenuPage implements OnInit {
  nroMesa: number = 7;
  platos: Item[] = [];
  bebidas: Item[] = [];
  itemSelected: Item | null = null;
  
  // Estados de carga
  isLoadingQR: boolean = false;
  isLoadingPlatos: boolean = false;
  isLoadingBebidas: boolean = false;
  isLoadingItems: boolean = false;
  constructor(
    private authService: AuthService,
    private clienteService: ClienteService,
    private toastController: ToastController,
    private router: Router
  ) { 
  }

  async ngOnInit() {
    // Cargar ambos en paralelo para mejor rendimiento
    await Promise.all([
      this.cargarPlatos(),
      this.cargarBebidas()
    ]);
  }
  async escanearQr() {
    this.isLoadingQR = true;
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
    } finally {
      this.isLoadingQR = false;
    }
  }

  async cargarPlatos(){
    this.isLoadingPlatos = true;
    try {
      this.platos = await this.authService.getPlatos();
      if (this.platos.length > 0) {
        this.showToast('Platos cargados', 'success');
      } else {
        this.showToast('No se encontraron platos', 'medium');
      }
    } catch (error) {
      console.error('Error cargando platos:', error);
      this.showToast('Error al cargar platos', 'danger');
    } finally {
      this.isLoadingPlatos = false;
    }
  }

  async cargarBebidas(){
    this.isLoadingBebidas = true;
    try {
      this.bebidas = await this.authService.getBebidas();
      if (this.bebidas.length > 0) {
        this.showToast('Bebidas cargadas', 'success');
      } else {
        this.showToast('No se encontraron bebidas', 'medium');
      }
    } catch (error) {
      console.error('Error cargando bebidas:', error);
      this.showToast('Error al cargar bebidas', 'danger');
    } finally {
      this.isLoadingBebidas = false;
    }
  }

  // handleImages(item: any){
  //   const imgArray = item.imagenes.split(',');
  //   item.imagenes = imgArray;
  //   return item.imagenes[0];
  // }

  seleccionarItem(item: Item, tipo: 'plato' | 'bebida'){
    if (this.isLoadingItems) return;
    
    this.isLoadingItems = true;
    setTimeout(() => {
      this.itemSelected = item;
      this.itemSelected!.tipo = tipo;
      console.log(this.itemSelected);
      this.isLoadingItems = false;
    }, 300); // Pequeño delay para mostrar el loading
  }

  onAddItem(item: Item){
    // Agregar el item al pedido usando el servicio
    this.clienteService.addItem(item);
    this.showToast(`${item.nombre} agregado al pedido`, 'success');
    this.itemSelected = null; // Cerrar el popup después de agregar
    console.log('Pedido actual:', this.clienteService.pedido());
  }

  calcularMonto(){
    return this.clienteService.getTotal();
  }

  volverHome(){
    this.router.navigate(["/home-cliente"])
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
