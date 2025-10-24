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
  totalConDescuento: number = 0;
  
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
    await Promise.all([
      this.cargarPlatos(),
      this.cargarBebidas()
    ]);
  }

  async actualizarTotal() {
    this.totalConDescuento = await this.clienteService.getTotal();
  }


  async checkDenied(){
    
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

  seleccionarItem(item: Item, tipo: 'plato' | 'bebida'){
    if (this.isLoadingItems) return;
    
    this.isLoadingItems = true;
    setTimeout(() => {
      this.itemSelected = item;
      this.itemSelected!.tipo = tipo;
      console.log(this.itemSelected);
      this.isLoadingItems = false;
    }, 300);
  }

  async onAddItem(item: Item){
    this.clienteService.addItem(item);
    this.showToast(`${item.nombre} agregado al pedido`, 'success');
    this.itemSelected = null;
    console.log('Pedido actual:', this.clienteService.pedido());
    await this.actualizarTotal();
  }

  // Método para obtener el subtotal (sin descuento)
  getSubtotalPedido(): number {
    return this.clienteService.getSubtotal();
  }

  // ✅ MODIFICADO: Ahora es async para obtener el total con descuento
  async calcularMonto() {
    return await this.clienteService.getTotal();
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