import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { supabase } from '../../services/supabase';
import { ToastController } from '@ionic/angular';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';

@Component({
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.page.html',
  styleUrls: ['./auth-callback.page.scss'],
  standalone: false
})
export class AuthCallbackPage implements OnInit {

  constructor(
    private router: Router,
    private toastController: ToastController,
    private customLoader: CustomLoaderService,
    private tipoClienteService: TipoClienteService
  ) {}

  async ngOnInit() {
    console.log('📄 [CALLBACK] Procesando callback OAuth...');
    
    await this.customLoader.show('Procesando inicio de sesión...');
  

    try {
      // Esperar a que Supabase procese OAuth
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Obtener sesión con reintentos
      let session = null;
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          session = data.session;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!session?.user) {
        console.error('❌ No se obtuvo sesión válida');
        await this.customLoader.hide();
        await this.router.navigate(['/login'], { replaceUrl: true });
        this.showToast('No se pudo iniciar sesión', 'danger');
        return;
      }

      console.log('✅ Usuario autenticado:', session.user.email);
      console.log('📋 User ID:', session.user.id);

      // 🔍 PASO 1: Buscar si ya existe un cliente con este EMAIL
      const { data: clienteExistente, error: errorBusqueda } = await supabase
        .from('clientes')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      if (errorBusqueda && errorBusqueda.code !== 'PGRST116') {
        console.error('❌ Error buscando cliente por email:', errorBusqueda);
      }

      let cliente = null;

      if (clienteExistente) {
        console.log('🔗 Cliente existente encontrado con email:', session.user.email);
        
        // ✅ VINCULAR cuenta OAuth al cliente existente
        if (!clienteExistente.user_id) {
          console.log('🔄 Vinculando cuenta OAuth al cliente existente...');
          
          const { data: clienteActualizado, error: errorVincular } = await supabase
            .from('clientes')
            .update({ 
              user_id: session.user.id,
              email_confirmado: true,
              foto: session.user.user_metadata?.['picture'] || clienteExistente.foto
            })
            .eq('id_cliente', clienteExistente.id_cliente)
            .select()
            .single();

          if (errorVincular) {
            console.error('❌ Error vinculando cuenta:', errorVincular);
            await this.customLoader.hide();
            this.showToast('Error al vincular cuenta', 'danger');
            return;
          }

          cliente = clienteActualizado;
          console.log('✅ Cuenta OAuth vinculada exitosamente');
          this.showToast('Cuenta vinculada exitosamente', 'success');
        } else if (clienteExistente.user_id === session.user.id) {
          // Ya está vinculado con este user_id
          console.log('✅ Cliente ya vinculado con esta cuenta OAuth');
          cliente = clienteExistente;
        } else {
          // Otro user_id diferente
          console.error('❌ El email ya está vinculado a otra cuenta');
          await this.customLoader.hide();
          await supabase.auth.signOut();
          await this.router.navigate(['/login'], { replaceUrl: true });
          this.showToast('Este email ya está vinculado a otra cuenta', 'danger');
          return;
        }

      } else {
        // 🔍 PASO 2: Buscar por user_id (OAuth ya usado previamente)
        console.log('🔍 Buscando cliente por user_id...');
        
        for (let i = 0; i < 5; i++) {
          const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('❌ Error buscando cliente por user_id:', error);
          }

          if (data) {
            cliente = data;
            console.log('✅ Cliente encontrado por user_id:', cliente);
            break;
          }

          if (i < 4) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }

        // Si no existe, crear nuevo cliente
        if (!cliente) {
          console.log('➕ Cliente no encontrado, creando nuevo...');
          cliente = await this.crearCliente(session.user);
          
          if (!cliente) {
            console.error('❌ No se pudo crear el cliente');
            await this.customLoader.hide();
            await this.router.navigate(['/login'], { replaceUrl: true });
            this.showToast('Error al crear cuenta', 'danger');
            return;
          }
        }
      }

      // Actualizar datos en TipoClienteService
      console.log('📤 Actualizando TipoClienteService con cliente:', cliente);
      this.tipoClienteService['tipoClienteSubject'].next('registrado');
      this.tipoClienteService['clienteData'].next(cliente);

      await this.customLoader.hide();

      // Redirigir según estado
      if (cliente.estado === 'aprobado') {
        console.log('✅ Cliente aprobado, redirigiendo a home-cliente');
        await this.router.navigate(['/home-cliente'], { replaceUrl: true });
        this.showToast(`¡Bienvenido ${cliente.nombre}!`, 'success');
      } else if (cliente.estado === 'pendiente') {
        console.log('⏳ Cliente pendiente, redirigiendo a pre-sala');
        await this.router.navigate(['/pre-sala'], { replaceUrl: true });
        this.showToast('Cuenta pendiente de aprobación', 'warning');
      } else {
        console.log('❌ Cliente rechazado');
        await supabase.auth.signOut();
        await this.router.navigate(['/login'], { replaceUrl: true });
        this.showToast('Cuenta rechazada', 'danger');
      }

    } catch (error: any) {
      console.error('❌ Error en callback OAuth:', error);
      await this.customLoader.hide();
      this.showToast('Error al procesar inicio de sesión: ' + error.message, 'danger');
      await this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  private async crearCliente(user: any) {
    try {
      const nombreCompleto = user.user_metadata?.full_name || 
                            user.user_metadata?.name ||
                            user.email?.split('@')[0] || 
                            'Usuario';
      
      const partes = nombreCompleto.split(' ');

      const datos = {
        user_id: user.id,
        nombre: partes[0] || 'Usuario',
        apellido: partes.slice(1).join(' ') || 'OAuth',
        dni: `OAUTH-${Date.now()}`,
        email: user.email,
        foto: user.user_metadata?.picture || user.user_metadata?.avatar_url || null,
        estado: 'aprobado', // ✅ Aprobar automáticamente usuarios OAuth
        email_confirmado: true
      };

      console.log('📝 Insertando nuevo cliente:', datos);

      const { data, error } = await supabase
        .from('clientes')
        .insert([datos])
        .select()
        .single();

      if (error) {
        console.error('❌ Error insertando cliente:', error);
        throw error;
      }

      console.log('✅ Cliente creado exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en crearCliente:', error);
      return null;
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}