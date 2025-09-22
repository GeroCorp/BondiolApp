import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-tab3-mesa',
  templateUrl: './tab3-mesa.component.html',
  styleUrls: ['./tab3-mesa.component.scss'],
})
export class Tab3MesaComponent implements OnInit {
  mesa: any = null;

  constructor(private supabase: AuthService) {}

  async ngOnInit() {
    
    const { data, error } = await this.supabase.client
      .from('clientes_anonimos')
      .select('mesa_asignada, mesas(*)')
      .eq('en_espera', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      this.mesa = data[0].mesas;
    }
  }
}
