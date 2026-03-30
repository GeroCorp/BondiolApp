import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ClienteService } from 'src/app/services/cliente.service';
import { Notification } from 'src/app/services/notification';
import { ViewChild, ElementRef } from '@angular/core';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';

type Msg = {
  contenido: string, 
  nombre_usuario: string, 
  date_sended: string,
  nroMesa: number
}

@Component({
  selector: 'app-tab3-consulta',
  templateUrl: './tab3-consulta.page.html',
  styleUrls: ['./tab3-consulta.page.scss'],
  standalone: false,
})
export class Tab3ConsultaPage implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;

  messages = signal<Msg[]>([]);
  loading = signal(false);
  newMessage: string = '';
  username: string = '';
  mesaActual: number | null = null;
  mesaId: number | null = null;
  private subscription: any;
  private sessionStartTime: string = ''; // ✅ Timestamp de inicio de sesión del cliente

  private notificationService: Notification = inject(Notification);

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private tipoClienteService: TipoClienteService
  ) { }

  async ngOnInit() {
    try {
      const isAnonimo = this.tipoClienteService.isAnonimo();
      const clienteData = this.tipoClienteService.getClienteData();

      if (isAnonimo) {
        this.username = clienteData?.nombre || 'Cliente Anónimo';
        this.mesaId = clienteData?.mesa_asignada || null;
        
        // ✅ CAMBIO CRÍTICO: Usar fecha de asignación de mesa como inicio de sesión
        // Esto persiste entre recargas porque está en la BD
        const fechaAsignacion = clienteData?.fecha_asignacion;
        
        if (fechaAsignacion) {
          this.sessionStartTime = fechaAsignacion;
          console.log('🎭 Usando fecha de asignación de mesa:', this.sessionStartTime);
        } else {
          // ✅ Fallback: Si no hay fecha_asignacion, usar created_at del cliente
          this.sessionStartTime = clienteData?.created_at || new Date().toISOString();
          console.log('🎭 Usando created_at del cliente:', this.sessionStartTime);
        }
        
        console.log('🎭 Cliente anónimo conectado:', {
          nombre: this.username,
          mesaId: this.mesaId,
          sessionStart: this.sessionStartTime
        });

        if (!this.mesaId) {
          console.error('❌ Cliente anónimo sin mesa asignada');
          return;
        }

        const { data: mesaData } = await this.clienteService.client
          .from('mesas')
          .select('numero')
          .eq('id', this.mesaId)
          .single();

        if (mesaData) {
          this.mesaActual = mesaData.numero;
          console.log('🪑 Número de mesa:', this.mesaActual);
        } else {
          console.error('❌ No se pudo obtener número de mesa');
          return;
        }
      } else {
        // ✅ CLIENTE REGISTRADO: Usar fecha de asignación de mesa también
        this.username = await this.clienteService.getNombreCliente();
        const clienteId = await this.clienteService.getClientId();
        this.mesaId = await this.clienteService.getMesaID(clienteId);
        this.mesaActual = await this.clienteService.getNroMesa(clienteId);
        
        // ✅ Obtener fecha de asignación de mesa para cliente registrado
        const { data: clienteDataReg } = await this.clienteService.client
          .from('clientes')
          .select('created_at')
          .eq('id_cliente', clienteId)
          .single();
        
        this.sessionStartTime = clienteDataReg?.created_at || new Date().toISOString();
        
        console.log('👤 Cliente registrado conectado:', {
          nombre: this.username,
          mesa: this.mesaActual,
          mesaId: this.mesaId,
          clienteId: clienteId,
          sessionStart: this.sessionStartTime
        });
      }

      if (!this.mesaActual) {
        console.error('❌ Cliente sin mesa asignada');
        return;
      }

      await this.loadMessages();
      this.suscribirseAMensajes();

    } catch (error) {
      console.error('❌ Error en ngOnInit:', error);
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      console.log('🔌 Desuscrito del chat');
    }
  }

  private suscribirseAMensajes() {
    if (!this.mesaActual) {
      console.error('❌ No hay mesa asignada para suscribirse');
      return;
    }

    console.log('📡 Suscribiéndose a mensajes de la mesa:', this.mesaActual);

    this.subscription = this.clienteService.client
      .channel(`chat-cliente-mesa-${this.mesaActual}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `nroMesa=eq.${this.mesaActual}`
        },
        async (payload) => {
          console.log('📩 Nuevo mensaje recibido:', payload);
          
          const nuevoMensaje = payload.new as Msg;
          
          // ✅ El filtro de mesa ya está en el subscribe, no necesitamos comparar fechas
          if (nuevoMensaje.nroMesa === this.mesaActual) {
            this.messages.update(mensajes => [...mensajes, nuevoMensaje]);
            setTimeout(() => this.scrollToBottom(), 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción:', status);
      });
  }

  async sendMessage() {
    if (!this.newMessage.trim()) return;

    const tempContent = this.newMessage;
    this.newMessage = '';

    try {
      await this.clienteService.sendMessage(tempContent);
      console.log('✅ Mensaje enviado correctamente');
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      this.newMessage = tempContent;
    }
  }

  async loadMessages() {
    if (!this.mesaActual) {
      console.error('❌ No hay mesa asignada');
      return;
    }

    this.loading.set(true);
    try {
      console.log('📋 Cargando mensajes desde:', this.sessionStartTime);
      
      // ✅ Solo cargar mensajes posteriores a sessionStartTime (fecha_asignacion de mesa)
      const { data: messagesReceived, error } = await this.clienteService.client
        .from('mensajes')
        .select('*')
        .eq('nroMesa', this.mesaActual)
        .gte('date_sended', this.sessionStartTime) // ✅ FILTRO CLAVE
        .order('date_sended', { ascending: true });
      
      if (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        this.messages.set([]);
        return;
      }

      console.log('📋 Mensajes cargados:', messagesReceived?.length || 0);
      console.log('📢 Mesa actual:', this.mesaActual);
      console.log('🕐 Filtro desde:', this.sessionStartTime);
      
      if (messagesReceived && messagesReceived.length > 0) {
        console.log('📨 Primer mensaje:', messagesReceived[0]);
        console.log('📨 Último mensaje:', messagesReceived[messagesReceived.length - 1]);
      }
      
      this.messages.set(messagesReceived || []);
      
      setTimeout(() => this.scrollToBottom(), 200);

    } catch (error) {
      console.error('❌ Error al cargar los mensajes:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (error) {
      console.error('Error en scroll:', error);
    }
  }

  volverHome() {
    this.router.navigate(["/home-cliente"]);
  }
}