import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-tab1-anonimo',
  templateUrl: './tab1-anonimo.component.html',
  styleUrls: ['./tab1-anonimo.component.scss'],
})
export class Tab1AnonimoComponent {
  nombre: string = '';
  foto: string | null = null;

  constructor(private supabase: AuthService) {}

  async subirFoto(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const filePath = `anonimos/${Date.now()}-${file.name}`;
    const { data, error } = await this.supabase.client.storage
      .from('fotos')
      .upload(filePath, file);

    if (!error) {
      const { data: publicUrl } = this.supabase.client.storage
        .from('fotos')
        .getPublicUrl(filePath);
      this.foto = publicUrl.publicUrl;
    }
  }

  async registrarAnonimo() {
    if (!this.nombre || !this.foto) {
      alert('Debes completar nombre y foto');
      return;
    }

    const { data, error } = await this.supabase.client
      .from('clientes_anonimos')
      .insert([{ nombre: this.nombre, foto: this.foto }])
      .select();

    if (!error) {
      alert('Ingresaste a la lista de espera');
    }
  }
}
