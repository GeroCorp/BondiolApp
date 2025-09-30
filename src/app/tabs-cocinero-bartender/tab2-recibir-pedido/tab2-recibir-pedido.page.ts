 import { Component, OnInit } from '@angular/core';
import { PerfilService } from 'src/app/services/perfilService';

@Component({
  selector: 'app-tab2-recibir-pedido',
  standalone: false,
  templateUrl: './tab2-recibir-pedido.page.html',
  styleUrls: ['./tab2-recibir-pedido.page.scss'],
})
export class Tab2RecibirPedidoPage {
  perfil: string | null = null;

  constructor(private perfilService: PerfilService) {
    this.perfil = this.perfilService.getPerfil();
    console.log('Perfil recibido en Tabs cocinero-bartender:', this.perfil);
  }


}
