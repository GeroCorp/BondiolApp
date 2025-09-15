import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  imports: [CommonModule, IonicModule, FormsModule],
})
export class AdminComponent implements OnInit  {
   perfil: string | null = null;

   constructor(private auth: AuthService, private router: Router) {}

  async ngOnInit() {
    const usuario = await this.auth.getUsuarioConPerfil();
    this.perfil = usuario.perfil;
  }

  agregarEmpleado() {
    this.router.navigate(['/tabs-admin/tab1-carga-empleado'], {replaceUrl: true}); // redirigir a tabs empleado
  }
  agregarMesa() {
    this.router.navigate(['/tabs-admin/tab2-carga-mesas'], {replaceUrl: true}); // redirigir a tabs mesas
  }
  adminCliente() {
    this.router.navigate(['/tabs-admin/tab3-admin-cliente'], {replaceUrl: true}); // Redirigir a tabs cliente
  }

}
