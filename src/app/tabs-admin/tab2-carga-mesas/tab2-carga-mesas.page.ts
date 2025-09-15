import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tab2-carga-mesas',
  templateUrl: './tab2-carga-mesas.page.html',
  styleUrls: ['./tab2-carga-mesas.page.scss'],
  standalone: false
})
export class Tab2CargaMesasPage {

  email: string | null = null;
  perfil: string | null = null;

  constructor(private router: Router) {
    this.email = history.state['email'] ?? null;
    this.perfil = history.state['perfil'] ?? null;
    console.log('Perfil recibido en tabs:', this.perfil);
  }

  // No se usa por ahora
  // volverHome() {
  //   this.router.navigate(['/home'], { state: {email: this.email, perfil: this.perfil}, replaceUrl: true });
  // }

}
