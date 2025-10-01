import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/supabase';
import { IonTabs, IonTabButton } from "@ionic/angular/standalone";

@Component({
  selector: 'app-tabs-cliente',
  templateUrl: './tabs-cliente.component.html',
  styleUrls: ['./tabs-cliente.component.scss'],
})
export class TabsClienteComponent  implements OnInit {
mesa: any = null;

  constructor(private supabase: AuthService) {}

  async ngOnInit() {
    // Ejemplo: traer mesa asignada al último cliente anónimo
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
