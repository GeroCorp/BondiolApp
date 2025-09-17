import { Component } from '@angular/core';
import { PerfilService } from 'src/app/services/perfilService';

@Component({
  selector: 'app-tab3-admin-cliente',
  templateUrl: './tab3-admin-cliente.page.html',
  styleUrls: ['./tab3-admin-cliente.page.scss'],
  standalone: false
})
export class Tab3AdminClientePage {
  perfil: string | null = null

  constructor(private perfilService: PerfilService) { 
    this.perfil = this.perfilService.getPerfil();
    console.log('Perfil recibido en Tabs admin:', this.perfil);
  }

  

}
