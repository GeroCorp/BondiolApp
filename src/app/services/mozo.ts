import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Mozo {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }
  
  async getChatsMesas(id_mesa: number){
    const { data, error } = await this.supabase
    .from('mensajes')
    .select('*')
    .eq('nroMesa', id_mesa)
    .order('date_sended', { ascending: true });

    if (error) {
      console.error('Error al obtener los mensajes del chat:', error);
      return [];
    }
    return data;
  }

  async sendMessage(id_mesa: number, contenido: string, nombre_usuario: string = 'Mozo') {
    const { error } = await this.supabase
    .from('mensajes')
    .insert([
      {
        contenido: contenido,
        nombre_usuario: nombre_usuario,
        date_sended: new Date().toISOString(),
        nroMesa: id_mesa
      }
    ]);

    if (error) {
      console.error('❌ Error enviando mensaje:', error);
      throw new Error('Error enviando mensaje: ' + error.message);
    }

    console.log('✅ Mensaje enviado correctamente a mesa:', id_mesa);
  }

  async subscribeToNewMessages(signal: any){
    try{
      this.supabase.channel('custom-messages-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'mensajes' },
          (payload) => {
            console.log('Nuevo mensaje recibido:', payload);
            const newRow = payload.new;
            signal.update((arr: any) =>{
              return [...arr, newRow]
            })
        }
      )
      .subscribe();
    }catch (error){
      console.error('Error al suscribirse a nuevos mensajes: ' + error);
    }
  }

  async getNombreMozo(){
  
    const user = this.supabase.auth.getUser();
    const id = (await user).data.user?.id;

    const { data, error } = await this.supabase
    .from('empleados')
    .select('nombre')
    .eq('perfil', 'mozo')
    .eq('user_id', id)
    
    if (error) throw new Error('Error obteniendo nombre de mozo: ' + error.message);
    return data ? data[0].nombre : null;
  }

}
