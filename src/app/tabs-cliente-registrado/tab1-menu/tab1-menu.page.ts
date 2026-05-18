import { Component, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/supabase';
import { ClienteService } from '../../services/cliente.service';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { CustomLoaderService } from '../../services/custom-loader.service';

interface Item {
  id: number;
  nombre: string;
  precio: number;
  tipo: 'plato' | 'bebida';
  descripcion?: string;
  tiempo?: number;
  imagenes?: string;
}

@Component({
  selector: 'app-tab1-menu',
  templateUrl: './tab1-menu.page.html',
  styleUrls: ['./tab1-menu.page.scss'],
  standalone: false,
})
export class Tab1MenuPage implements OnInit {
  nroMesa: number | null = null;
  platos: Item[] = [];
  bebidas: Item[] = [];

  allProds = signal<Item[]>([]);

  itemSelected: Item | null = null;
  totalConDescuento: number = 0;
  
  // Estados de carga
  isLoadingQR: boolean = false;
  isLoadingPlatos: boolean = false;
  isLoadingBebidas: boolean = false;
  isLoadingItems: boolean = false;
  
  
  constructor(
    private authService: AuthService,
    public clienteService: ClienteService,
    private toastController: ToastController,
    private router: Router,
    private customLoader: CustomLoaderService
  ) { 
  }

  async ngOnInit() {
    await this.customLoader.show('Cargando menú...');
    this.nroMesa = this.clienteService.mesaAsignada;

    await Promise.all([
      this.cargarPlatos(),
      this.cargarBebidas()
    ]);
    this.allProds.set([...this.platos, ...this.bebidas]);

    // Cargar pedido rechazado si existe — así el botón "Hacer Pedido"
    // se habilita de inmediato sin necesidad de agregar otro item
    const rechazado = await this.clienteService.getRejectedOrder();
    if (rechazado) {
      await this.showToast(
        '⚠️ Tu pedido fue rechazado. Podés modificarlo desde "Hacer Pedido".',
        'danger'
      );
    }

    this.customLoader.hide();
  }

  async actualizarTotal() {
    this.totalConDescuento = await this.clienteService.getTotal();
  }
  getCantidadItemsPedido(): number {
    return this.clienteService.pedido().length;
  }
  async cargarPlatos(){
    this.isLoadingPlatos = true;
    try {
      const platos = await this.authService.getPlatos();
      this.platos = (platos || []).map(plato => ({ ...plato, tipo: 'plato' }));
      if (this.platos.length === 0) {
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
      const bebidas = await this.authService.getBebidas();
      this.bebidas = (bebidas || []).map(bebida => ({ ...bebida, tipo: 'bebida' }));
      if (this.bebidas.length === 0) {
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

getChunks(array: any[], size: number): any[][] {
    const chunks: any[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  getFirstImage(imagenes: any): string {
  try {
    if (!imagenes) return 'assets/images/placeholder.png';
    let lista: string[] = [];

    if (typeof imagenes === 'string') {
      lista = imagenes
        .split(',')
        .map((url: string) => url.trim())
        .filter((url: string) => url.length > 0);
    } else if (Array.isArray(imagenes)) {
      lista = imagenes;
    }
    const valida = lista.find(url => url.startsWith('http'));

    return valida || 'assets/images/placeholder.png';

  } catch {
    return 'assets/images/placeholder.png';
  }
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
  async hacerPedido() {
    const rechazado = await this.clienteService.getRejectedOrder();
    if (rechazado) {
      await this.showToast(
        '⚠️ Tu pedido anterior fue rechazado. Podés modificarlo.',
        'medium'
      );
    }
    this.router.navigate(["/tabs-cliente-registrado/tab2-pedido"]);
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