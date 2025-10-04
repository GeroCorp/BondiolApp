import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-tab2-recibir-pedido',
  templateUrl: './tab2-recibir-pedido.page.html',
  styleUrls: ['./tab2-recibir-pedido.page.scss'],
  standalone: false
})
export class Tab2RecibirPedidoPage implements OnInit {
  perfil: string | null = null;
  pedidos: any[] = [];
  isLoading = true;

  constructor(private supabaseService: AuthService) {}

  async ngOnInit() {
    // Suponiendo que el perfil se obtiene de la sesión actual
    const usuario = await this.supabaseService.getUsuarioConPerfil();
    this.perfil = usuario?.perfil ?? null;
    await this.cargarPedidosPendientes();
  }

   async cargarPedidosPendientes() {
  this.isLoading = true;
  let sector: 'cocina' | 'bar' | null = null;
  if (this.perfil === 'cocinero') sector = 'cocina';
  if (this.perfil === 'bartender') sector = 'bar';
  if (sector) {
    const { data, error } = await this.supabaseService.getPedidosPendientesSector(sector);
    if (!error) {
      this.pedidos = data;
    }
  }
  this.isLoading = false;
}
}