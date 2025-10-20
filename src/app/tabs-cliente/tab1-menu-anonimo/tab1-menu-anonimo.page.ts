import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/supabase';
import { ClienteAnonimoService } from '../../services/cliente-anonimo.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-tab1-menu-anonimo',
  templateUrl: './tab1-menu-anonimo.page.html',
  styleUrls: ['./tab1-menu-anonimo.page.scss'],
  standalone: false,
})
export class Tab1MenuAnonimoPage implements OnInit {
  numeroMesa: string = '';
  platos: any[] = [];
  bebidas: any[] = [];
  itemSelected: any = null;
  cantidad: number = 1;

  constructor(
    private supabase: AuthService,
    private clienteService: ClienteAnonimoService,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.numeroMesa = sessionStorage.getItem('numero_mesa') || '';
    await this.cargarMenu();
  }

  async cargarMenu() {
    this.platos = await this.supabase.getPlatos();
    this.bebidas = await this.supabase.getBebidas();
  }

  seleccionarItem(item: any, tipo: 'plato' | 'bebida') {
    this.itemSelected = { ...item, tipo };
    this.cantidad = 1;
  }

  aumentar() {
    this.cantidad++;
  }

  disminuir() {
    if (this.cantidad > 1) this.cantidad--;
  }

  getSubtotal(): number {
    return this.itemSelected ? this.itemSelected.precio * this.cantidad : 0;
  }

  agregarAlPedido() {
    if (!this.itemSelected) return;

    const item = {
      ...this.itemSelected,
      quantity: this.cantidad,
      subtotal: this.getSubtotal()
    };

    this.clienteService.agregarItem(item);
    this.showToast(`${item.nombre} agregado`, 'success');
    this.itemSelected = null;
    this.cantidad = 1;
  }

  calcularTotal(): number {
    return this.clienteService.obtenerTotal();
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}