import { ChangeDetectorRef, Component, effect, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/supabase';
import { ToastController, AlertController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Notification } from 'src/app/services/notification';
import { ListaEsperaService } from 'src/app/services/lista-espera.service';
import { HapticService } from 'src/app/services/haptic.service';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { supabase } from '../../services/supabase';



interface Cliente {
  id_cliente?: number;
  nombre: string;
  apellido: string;
  dni?: string;
  email?: string | null;
  foto?: string | null;
  estado?: string;
  created_at?: string;
}

@Component({
  selector: 'app-home-cliente',
  templateUrl: './home-cliente.page.html',
  styleUrls: ['./home-cliente.page.scss'],
  standalone: false
})
export class HomeClientePage implements OnInit {
  cliente: any = null;
  enEspera: boolean = true;
  mesaAsignada: number | null = null;
  mesaVerificada: boolean = false;
  pedidosHistorial: any[] = [];
  private pedidosSubscription: any = null;
  private mesaSubscription: any = null;
  private checkInterval: any = null;
  isRegistrado: boolean = true;
  perfil = "cliente";
  private notificationService: Notification = inject(Notification)



  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private clienteService: ClienteService,
    private cd: ChangeDetectorRef,
    private listaEsperaService: ListaEsperaService,
    private hapticService: HapticService,
    private tipoClienteService: TipoClienteService
  ) {
    // ✅ EFECTO: Actualizar estado de espera para registrados
    effect(() => {
      if (!this.tipoClienteService.isAnonimo()) {
        this.enEspera = this.clienteService.clienteEnEspera();
        console.log('📊 Estado del cliente en espera (registrado):', this.enEspera);
      }
    });

    // ✅ SUSCRIPCIÓN: Actualizar datos del cliente
    this.tipoClienteService.clienteData$.subscribe(async data => {
      console.log('📥 clienteData$ actualizado:', data);
      
      this.cliente = data;

      if (data) {
        if (data.mesa_asignada) {
          this.mesaAsignada = data.mesa_asignada;
          this.enEspera = false;
          // ✅ NO cambiar mesaVerificada aquí - solo con QR
          
          console.log('✅ Cliente con mesa asignada:', {
            mesa: this.mesaAsignada,
            enEspera: this.enEspera,
            verificada: this.mesaVerificada
          });
        } else {
          this.mesaAsignada = null;
          this.enEspera = data.en_espera === undefined ? true : !!data.en_espera;
          this.mesaVerificada = false;
          
          console.log('⏳ Cliente sin mesa (en espera):', {
            enEspera: this.enEspera,
            mesaAsignada: this.mesaAsignada
          });
        }

        try {
          (this.tipoClienteService as any).startRealtimeForCliente?.(data);
        } catch (e) {
          console.warn('⚠️ No se pudo iniciar realtime:', e);
        }

        if (!this.mesaAsignada && !this.enEspera) {
          await this.tipoClienteService.refreshClienteData().catch(() => {});
          const updated = this.tipoClienteService.getClienteData();
          if (updated?.mesa_asignada) {
            this.mesaAsignada = updated.mesa_asignada;
            this.enEspera = false;
            console.log('🔄 Mesa asignada detectada después de refresh:', this.mesaAsignada);
          }
        }
      } else {
        this.enEspera = false;
        this.mesaAsignada = null;
        this.mesaVerificada = false;
      }

      this.cd.detectChanges();
    });

    // ✅ TIPO DE CLIENTE
    this.tipoClienteService.tipoCliente$.subscribe(tipo => {
      this.isRegistrado = tipo === 'registrado';
      console.log('👤 Tipo de cliente:', tipo);
    });
  }

  

  

  private async setupMesaSubscription() {
    // Limpiar suscripción anterior
    if (this.mesaSubscription) {
      this.mesaSubscription.unsubscribe?.();
    }

    if (!this.cliente) return;

    // Suscribirse a cambios en la fila de clientes_anonimos (importante: el maitre debe actualizar esta tabla)
    const idAnon = this.cliente.id_clienteanonimo ?? this.cliente.id_cliente;
    if (idAnon) {
      this.mesaSubscription = supabase
        .channel(`anonimo-mesa-${idAnon}`)
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clientes_anonimos',
            filter: `id_clienteanonimo=eq.${idAnon}`
          },
          async (payload) => {
            console.log('Realtime clientes_anonimos payload:', payload);
            // refrescar datos y actualizar UI
            await this.tipoClienteService.refreshClienteData().catch(() => {});
            const updated = this.tipoClienteService.getClienteData();
            this.mesaAsignada = updated?.mesa_asignada ?? this.mesaAsignada;
            this.enEspera = updated?.en_espera === undefined ? this.enEspera : !!updated?.en_espera;
            this.cd.detectChanges();
          })
        .subscribe();
      return;
    }

    // Fallback: suscribirse a la tabla mesas por numero si tienes mesaAsignada (por si el maitre actualiza desde mesas)
    if (this.mesaAsignada) {
      this.mesaSubscription = supabase
        .channel('mesa-changes')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mesas',
            filter: `numero=eq.${this.mesaAsignada}`
          },
          async () => {
            console.log('Realtime mesas payload');
            await this.tipoClienteService.refreshClienteData().catch(() => {});
            const updated = this.tipoClienteService.getClienteData();
            this.mesaAsignada = updated?.mesa_asignada ?? this.mesaAsignada;
            this.enEspera = updated?.en_espera === undefined ? this.enEspera : !!updated?.en_espera;
            this.cd.detectChanges();
          })
        .subscribe();
    }
  }

 

  async ngOnInit() {
    // ✅ CARGAR DATOS SEGÚN TIPO DE CLIENTE
    if (this.tipoClienteService.isRegistrado()) {
      await this.cargarDatosCliente();
      await this.verificarMesaAsignada();
    }

    // Polling de respaldo
    this.checkInterval = setInterval(async () => {
      if (this.cliente) {
        await this.tipoClienteService.refreshClienteData().catch(() => {});
      }
    }, 10000);
  }

  ngOnDestroy() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.tipoClienteService.stopRealtime();
    if (this.pedidosSubscription) {
      this.pedidosSubscription.unsubscribe();
    }
  }

  shouldShowListaEspera(): boolean {
    const show = this.tipoClienteService.isAnonimo() && 
                  this.enEspera && 
                  !this.mesaAsignada && 
                  !this.mesaVerificada;
    
    console.log('shouldShowListaEspera:', {
      isAnonimo: this.tipoClienteService.isAnonimo(),
      enEspera: this.enEspera,
      mesaAsignada: this.mesaAsignada,
      mesaVerificada: this.mesaVerificada,
      resultado: show
    });
    
    return show;
  }

  shouldShowVerificarMesa(): boolean {
    const show = !!this.mesaAsignada && !this.mesaVerificada;
    
    console.log('shouldShowVerificarMesa:', {
      mesaAsignada: this.mesaAsignada,
      mesaVerificada: this.mesaVerificada,
      resultado: show
    });
    
    return show;
  }
  
  

  async ingresarComoAnonimo() {
    const alert = await this.alertController.create({
      header: 'Ingreso Anónimo',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Ingrese su nombre'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Ingresar',
          handler: async (data) => {
            if (!data.nombre) {
              this.showToast('Debe ingresar un nombre', 'warning');
              return false; 
            }
            await this.procesarIngresoAnonimo(data.nombre);
            return true; 
          }
        }
      ]
    });

    await alert.present();
}

private async procesarIngresoAnonimo(nombre: string) {
    try {
      const fotoDefault: string | null = '';

      // Crea o carga el cliente anónimo en el servicio (retorna objeto con flags)
      const clienteCreado = await this.tipoClienteService.setClienteAnonimo(nombre, fotoDefault);

      // Normalizar y asignar propiedades necesarias para la UI
      this.cliente = {
        id_cliente: clienteCreado.id_cliente ?? clienteCreado.id_clienteanonimo,
        nombre: clienteCreado.nombre,
        apellido: clienteCreado.apellido ?? '',
        foto: clienteCreado.foto ?? fotoDefault,
        estado: (clienteCreado.estado ?? (clienteCreado.en_espera ? 'pendiente' : 'aprobado')),
        created_at: clienteCreado.created_at ?? new Date().toISOString()
      };

      // Inicializar flags específicos para la UI (forzar enEspera true si la BD lo indica o por defecto)
      this.enEspera = clienteCreado.en_espera === undefined ? true : !!clienteCreado.en_espera;
      this.mesaAsignada = clienteCreado.mesa_asignada ?? null;
      this.mesaVerificada = false; // siempre false hasta escaneo

      // Forzar detección para que la plantilla actualice inmediatamente
      this.cd.detectChanges();

      this.showToast('Bienvenido ' + nombre, 'success');
    } catch (error) {
      console.error('Error:', error);
      this.showToast('Error al ingresar como anónimo', 'danger');
    }
  }

 async seleccionarClienteExistenteYContinuar(clienteSeleccionado: any) {
  console.log('🔍 Seleccionando cliente existente:', clienteSeleccionado);
  
  await this.tipoClienteService.loadClienteAnonimoExisting(clienteSeleccionado);
  
  // Normalizar localmente
  this.cliente = {
    id_cliente: clienteSeleccionado.id_clienteanonimo ?? clienteSeleccionado.id_cliente,
    id_clienteanonimo: clienteSeleccionado.id_clienteanonimo,
    nombre: clienteSeleccionado.nombre,
    apellido: clienteSeleccionado.apellido ?? '',
    foto: clienteSeleccionado.foto ?? '',
    created_at: clienteSeleccionado.created_at
  };
  
  // ✅ CORRECCIÓN: Normalizar flags correctamente
  if (clienteSeleccionado.mesa_asignada) {
    this.mesaAsignada = clienteSeleccionado.mesa_asignada;
    this.enEspera = false;
    this.mesaVerificada = false;
  } else {
    this.mesaAsignada = null;
    this.enEspera = true;
    this.mesaVerificada = false;
  }
  
  this.cd.detectChanges();
  
  // Mostrar mensaje apropiado
  if (this.mesaAsignada) {
    this.showToast(
      `Bienvenido ${clienteSeleccionado.nombre}. Mesa ${this.mesaAsignada} asignada. Escanea el QR para verificar.`,
      'success'
    );
  }
  
  this.router.navigate(['/home-cliente']);
}

  async checkMesaAsignada() {
    if (!this.cliente) return;

    try {
      const isAnon = this.tipoClienteService.isAnonimo();

      if (isAnon) {
        const idAnon = this.cliente.id_clienteanonimo ?? this.cliente.id_cliente;
        if (!idAnon) return;

        const { data, error } = await this.authService.client
          .from('clientes_anonimos')
          .select('mesa_asignada, en_espera, nombre')
          .eq('id_clienteanonimo', idAnon)
          .single();

        if (error) throw error;

        this.mesaAsignada = data?.mesa_asignada ?? null;
        this.enEspera = !(this.mesaAsignada); // si hay mesa, ya no está en espera
        // reset de verificación hasta que escanee
        this.mesaVerificada = false;

        if (this.mesaAsignada) {
          await this.setupMesaSubscription();
        }
      } else {
        const id = this.cliente.id_cliente ?? this.tipoClienteService.getClienteId();
        if (!id) return;

        const { data, error } = await this.authService.client
          .from('clientes')
          .select('mesa_asignada')
          .eq('id_cliente', id)
          .single();

        if (error) throw error;

        this.mesaAsignada = data?.mesa_asignada ?? null;
        this.enEspera = !(this.mesaAsignada);
        this.mesaVerificada = false;

        if (this.mesaAsignada) {
          await this.setupMesaSubscription();
        }
      }

      // Forzar actualización de la vista
      this.cd.detectChanges();
    } catch (err) {
      console.error('checkMesaAsignada error', err);
    }
  }

  // Métodos para verificar acceso a funcionalidades
  puedeAccederJuegos(): boolean {
    return this.isRegistrado && !!this.mesaAsignada;
  }

  puedeAccederEncuestas(): boolean {
    return this.isRegistrado && !!this.mesaAsignada;
  }

  async cargarDatosCliente() {
    try {
      const user = await this.authService.getCurrentUser();
      
      if (user) {
        this.cliente = await this.authService.getClienteByUserId(user.id);
        
        if (this.cliente) {
          console.log('✅ Cliente registrado cargado:', this.cliente);
          
          // ✅ Actualizar TipoClienteService con datos del cliente registrado
          this.tipoClienteService['clienteData'].next(this.cliente);
          
          this.notificationsInit();
          
          if (!this.cliente.email) {
            this.cliente.email = user.email;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar datos del cliente:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar tus datos', 'danger');
    }
  }

  async notificationsInit(){
    this.notificationService.setExternalUserId(this.cliente?.id_cliente?.toString() || '');
    this.clienteService.subscribeToHistorialPedidos();
  }

  async verificarMesaAsignada() {
    try {
      if (this.cliente?.id_cliente) {
        this.mesaAsignada = await this.clienteService.getNroMesa(this.cliente.id_cliente);
        console.log('🏠 Mesa asignada al cliente registrado:', this.mesaAsignada);
        
        if (this.mesaAsignada) {
          this.enEspera = false;
          // ✅ NO cambiar mesaVerificada aquí
        }
      }
    } catch (error) {
      console.error('❌ Error verificando mesa asignada:', error);
    }
  }

  async escanearQRMesa() {
    try {
      const granted = await BarcodeScanner.checkPermissions();
      if (granted.camera !== 'granted') {
        const permission = await BarcodeScanner.requestPermissions();
        if (permission.camera !== 'granted') {
          await this.hapticService.vibrateError();
          this.showToast('Se necesitan permisos de cámara', 'danger');
          return;
        }
      }

      const result = await BarcodeScanner.scan();

      if (result.barcodes && result.barcodes.length > 0) {
        const qrData = result.barcodes[0].displayValue;
        await this.procesarQRMesa(qrData);
      } else {
        await this.hapticService.vibrateError();
        this.showToast('No se detectó ningún QR', 'danger');
      }
    } catch (err: any) {
      console.error('Error al escanear QR:', err);
      await this.hapticService.vibrateError();
      this.showToast('Error al escanear: ' + err.message, 'danger');
    }
  }


  async escanearQRListaEspera() {
    try {
      const granted = await BarcodeScanner.checkPermissions();
      if (granted.camera !== 'granted') {
        const permission = await BarcodeScanner.requestPermissions();
        if (permission.camera !== 'granted') {
      await this.hapticService.vibrateError();
          this.showToast('Se necesitan permisos de cámara', 'danger');
          return;
        }
      }

      const result = await BarcodeScanner.scan();

      if (result.barcodes && result.barcodes.length > 0) {
        const qrData = result.barcodes[0].displayValue;
        this.router.navigate([qrData]);
      } else {
      await this.hapticService.vibrateError();
        this.showToast('No se detectó ningún QR', 'danger');
      }
    } catch (err: any) {
      console.error('Error al escanear QR:', err);
      await this.hapticService.vibrateError();
      this.showToast('Error al escanear: ' + err.message, 'danger');
    }
  }

  async procesarQRMesa(qrData: string) {
    try {
      const datosQR = qrData.split(',');
      
      if (datosQR.length !== 3) {
        await this.hapticService.vibrateError();
        this.showToast('QR inválido: formato incorrecto', 'danger');
        return;
      }

      const numeroMesa = parseInt(datosQR[0]);
      const capacidad = parseInt(datosQR[1]);
      const tipo = datosQR[2];

      if (isNaN(numeroMesa) || isNaN(capacidad)) {
        await this.hapticService.vibrateError();
        this.showToast('QR inválido: datos no válidos', 'danger');
        return;
      }

      console.log('📍 Mesa escaneada:', { numero: numeroMesa, capacidad, tipo });
      console.log('📍 Mesa asignada:', this.mesaAsignada);

      if (this.mesaAsignada && this.mesaAsignada !== numeroMesa) {
        this.showToast(
          `❌ Esta no es tu mesa asignada. Tu mesa es la ${this.mesaAsignada}, pero escaneaste la mesa ${numeroMesa}`,
          'danger'
        );
        return;
      }

      if (!this.mesaAsignada) {
        this.showToast(
          `❌ No tienes una mesa asignada. Debe asignarte una mesa antes de poder escanear el QR.`,
          'danger'
        );
        return;
      }

      await this.verificarMesa(numeroMesa, capacidad, tipo);

    } catch (error) {
      console.error('Error procesando QR:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al procesar el QR', 'danger');
    }
  }

  async verificarMesa(numeroMesa: number, capacidad: number, tipo: string) {
    try {
      const clientId = this.tipoClienteService.getClienteId();
      if (!clientId) {
        await this.hapticService.vibrateError();
        this.showToast('Error: No se pudo obtener tu ID de cliente', 'danger');
        return;
      }

      const { data: mesa, error: errorMesa } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', numeroMesa)
        .single();

      if (errorMesa || !mesa) {
        await this.hapticService.vibrateError();
        this.showToast(`La Mesa ${numeroMesa} no existe en el sistema`, 'danger');
        return;
      }

      if (mesa.cantidad !== capacidad || mesa.tipo !== tipo) {
        await this.hapticService.vibrateError();
        this.showToast(`Los datos del QR no coinciden con la mesa registrada`, 'danger');
        return;
      }

      // ✅ NO llamar a setMesa si ya está asignada
      if (!this.tipoClienteService.isAnonimo() && this.mesaAsignada) {
        // Solo verificar para registrados
        console.log('✅ Mesa ya asignada, solo verificando QR');
      } else {
        await this.clienteService.setMesa(clientId, numeroMesa);
      }

      // ✅ MARCAR COMO VERIFICADA
      this.mesaVerificada = true;
      this.enEspera = false;

      console.log(`✅ Mesa ${numeroMesa} verificada correctamente`);

      this.showToast(
        `✅ Mesa ${numeroMesa} verificada correctamente\n` +
        `Capacidad: ${capacidad} personas\n` +
        `Tipo: ${tipo}`,
        'success'
      );

    } catch (error) {
      console.error('Error verificando mesa:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al verificar la mesa', 'danger');
    }
  }

  async liberarMesaActual() {
    try {
      if (!this.cliente?.id_cliente || !this.mesaAsignada) return;

      await this.authService.client
        .from('mesas')
        .update({
          cliente_asignado: null,
          disponible: true
        })
        .eq('numero', this.mesaAsignada);

      console.log('Mesa anterior liberada');
    } catch (error) {
      console.error('Error liberando mesa actual:', error);
    }
  }

  async asignarMesa(numeroMesa: number) {
    try {
      if (!this.cliente?.id_cliente) {
        await this.hapticService.vibrateError();
        this.showToast('Error: No se pudo obtener tu ID de cliente', 'danger');
        return;
      }

      if (this.mesaAsignada) {
        this.showToast('Ya tienes una mesa asignada. Escanea el QR de tu mesa para verificarla.', 'warning');
        return;
      }

      const { data: mesa, error: errorMesa } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', numeroMesa)
        .maybeSingle();

      if (errorMesa || !mesa) {
        await this.hapticService.vibrateError();
        this.showToast(`La Mesa ${numeroMesa} no existe`, 'danger');
        return;
      }

      if (mesa.cliente_asignado && mesa.cliente_asignado !== this.cliente.id_cliente) {
        await this.hapticService.vibrateError();
        this.showToast(`La Mesa ${numeroMesa} está ocupada por otro cliente`, 'danger');
        return;
      }

      const resultado = await this.clienteService.setMesa(this.cliente.id_cliente, numeroMesa);

      if (resultado) {
        this.mesaAsignada = numeroMesa;
        this.mesaVerificada = true;
        this.enEspera = false;
        this.showToast(`✅ Mesa ${numeroMesa} asignada y verificada correctamente`, 'success');
      }

    } catch (error: any) {
      console.error('Error asignando mesa:', error);
      if (error.message.includes('ocupada')) {
        await this.hapticService.vibrateError();
        this.showToast(error.message, 'danger');
      } else {
        await this.hapticService.vibrateError();
        this.showToast('Error al asignar la mesa', 'danger');
      }
    }
  }

  async logout() {
    if (this.mesaAsignada && this.cliente?.id_cliente) {
      try {
        await this.clienteService.liberarMesaCliente();
      } catch (error) {
        console.error('Error liberando mesa al cerrar sesión:', error);
      }
    }

    await this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
    this.showToast('Sesión cerrada correctamente', 'medium');
  }

  async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning' = 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // Redirecciones con verificación

  verMenu() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }
    this.router.navigate(["/tabs-cliente-registrado/tab1-menu"]);
  }

  hacerPedido() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }
    this.router.navigate(["/tabs-cliente-registrado/tab2-pedido"]);
  }

  hacerConsulta() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }
    this.router.navigate(["/tabs-cliente-registrado/tab3-consulta"]);
  }

  verHistorial(){
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }

    this.loadHistorialPedidos();
    this.router.navigate(["/tabs-cliente-registrado/tab4-historial"]);
  }

  verJuegos() {
      if (!this.mesaVerificada) {
        this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
        return;
      }
      if (!this.isRegistrado) {
        this.showToast('⚠️ Los juegos son solo para clientes registrados', 'warning');
        return;
      }
      this.router.navigate(['/tabs-cliente-registrado/tab5-juegos']);
    }


    async solicitarCuenta() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }

    await this.pedirCuenta();
    this.router.navigate(['/tabs-cliente-registrado/tab8-cuenta']);
  }


    verEncuesta() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }
    if (!this.isRegistrado) {
      this.showToast('⚠️ Los juegos son solo para clientes registrados', 'warning');
      return;
    }
    this.router.navigate(['/tabs-cliente-registrado/tab6-encuesta']);
  }

  verResultados() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }
    this.router.navigate(['/tabs-cliente-registrado/tab7-resultados']);
  }

 async loadHistorialPedidos() {
    if (!this.cliente || !this.mesaAsignada) return;

    try {
      console.log('📋 Cargando historial para:', {
        isRegistrado: this.isRegistrado,
        clienteId: this.cliente.id_cliente || this.cliente.id_clienteanonimo,
        mesaId: this.mesaAsignada
      });

      // ✅ BUSCAR POR MESA (funciona para registrados y anónimos)
      const { data: pedidos, error } = await this.authService.client
        .from('pedidos')
        .select(`
          *,
          detalles_pedido(*),
          propinas(*)
        `)
        .eq('mesa', this.mesaAsignada)
        .order('fecha', { ascending: false });

      if (error) throw error;

      this.pedidosHistorial = pedidos || [];
      
      console.log('✅ Historial cargado:', this.pedidosHistorial.length, 'pedidos');
      
      this.setupPedidosSubscription();
      this.cd.detectChanges();
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
    }
  }

private setupPedidosSubscription() {
    try {
      if (this.pedidosSubscription) {
        this.pedidosSubscription.unsubscribe();
      }

      if (!this.mesaAsignada) return;

      this.pedidosSubscription = supabase
        .channel(`pedidos-mesa-${this.mesaAsignada}`)
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'pedidos',
            filter: `mesa=eq.${this.mesaAsignada}`
          },
          async () => {
            console.log('🔄 Actualización de pedidos detectada');
            await this.loadHistorialPedidos();
          }
        )
        .subscribe();

    } catch (error) {
      console.error('Error en suscripción de pedidos:', error);
    }
  }

  async pedirCuenta() {
    try {
      if (!this.mesaAsignada) {
        this.showToast('No tienes una mesa asignada', 'warning');
        return;
      }

      // buscar el pedido más reciente de la mesa
      const { data: pedido, error } = await this.authService.client
        .from('pedidos')
        .select('*')
        .eq('mesa', this.mesaAsignada)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error buscando pedido para pedir cuenta', error);
        this.showToast('Error al solicitar la cuenta', 'danger');
        return;
      }

      if (!pedido) {
        this.showToast('No se encontró ningún pedido para esta mesa', 'warning');
        return;
      }

      // Actualizar estado del pedido para indicar que se solicita cuenta (ajusta el valor según tus estados)
      const { error: updateError } = await this.authService.client
        .from('pedidos')
        .update({ estado: 'solicitando_pago' })
        .eq('id', pedido.id);

      if (updateError) {
        console.error('Error actualizando pedido al solicitar cuenta', updateError);
        this.showToast('Error al solicitar la cuenta', 'danger');
        return;
      }

      this.showToast('Cuenta solicitada. El mozo te atenderá pronto', 'success');
      // la suscripción realtime actualizará pedidosHistorial automáticamente
    } catch (err) {
      console.error('pedirCuenta error', err);
      this.showToast('Error al solicitar la cuenta', 'danger');
    }
  }

  /**
   * 🧪 [TESTING] Simular unirse a lista de espera sin escanear QR
   * Agrega al cliente directamente a la tabla lista_espera
   */
  async unirseListaEsperaSimulado() {
  try {
    const clientId = this.tipoClienteService.getClienteId();
    if (!clientId) {
      this.showToast('Error: No hay datos del cliente', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: '🧪 [TESTING] Unirse a Lista de Espera',
      inputs: [
        {
          name: 'cantidadPersonas',
          type: 'number',
          placeholder: 'Cantidad de personas',
          value: 2,
          attributes: { min: 1, max: 12, inputmode: 'numeric' }
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Unirse',
          handler: async (form) => {
            const cantidad = Number(form?.cantidadPersonas);
            if (!cantidad || cantidad < 1 || cantidad > 12) {
              this.showToast('Cantidad de personas debe ser entre 1 y 12', 'warning');
              return false; // mantiene el alert abierto
            }
            await this.procesarUnionListaEsperaTesting(cantidad);
            return true; // cierra el alert
          }
        }
      ]
    });

    await alert.present();
  } catch (error) {
    console.error('Error en unirseListaEsperaSimulado:', error);
    this.showToast('Error al abrir el formulario de testing', 'danger');
  }
}


  /**
   * Procesar la unión a lista de espera (modo testing)
   * Inserta directamente en la tabla lista_espera
   */
  async procesarUnionListaEsperaTesting(cantidadPersonas: number) {
    try {
      if (!this.cliente) {
        this.showToast('Error: No hay datos del cliente', 'danger');
        return;
      }

      console.log('🧪 [TESTING] Agregando a lista de espera:', {
        nombre: `${this.cliente.nombre} ${this.cliente.apellido}`,
        cantidad: cantidadPersonas
      });

      // Agregar a la tabla lista_espera usando el servicio
      const resultado = await this.listaEsperaService.agregarClienteEspera({
        nombre_cliente: `${this.cliente.nombre} ${this.cliente.apellido}`,
        cantidad_personas: cantidadPersonas
      });

      if (resultado.success) {
        console.log('✅ Cliente agregado a lista de espera:', resultado.data);
        
        // Asegurar que el cliente no tenga mesa asignada
        if (this.cliente.id_cliente) {
          const { error: updateError } = await this.authService.client
            .from('clientes')
            .update({ mesa_asignada: null })
            .eq('id_cliente', this.cliente.id_cliente);

          if (updateError) {
            console.error('Error actualizando cliente:', updateError);
          }
        }

        // Actualizar estado local
        this.mesaAsignada = null;
        this.mesaVerificada = false;
        this.enEspera = true;

        this.showToast(
          `✅ ¡Agregado a la lista de espera!\n` +
          `ID: ${resultado.data?.id}\n` +
          `Personas: ${cantidadPersonas}\n` +
          `El maître te asignará una mesa pronto`,
          'success'
        );

        // Mostrar información adicional
        setTimeout(() => {
          this.mostrarInfoListaEspera(resultado.data?.id);
        }, 3500);

      } else {
        await this.hapticService.vibrateError();
        this.showToast('Error al agregar a lista de espera', 'danger');
      }

    } catch (error) {
      console.error('Error procesando unión a lista de espera:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al procesar la solicitud', 'danger');
    }
  }

  /**
   * Mostrar información adicional sobre la lista de espera
   */
  async mostrarInfoListaEspera(clienteId?: number) {
    const alert = await this.alertController.create({
      header: '📋 En Lista de Espera',
      message: clienteId 
        ? `Tu ID de lista: <strong>${clienteId}</strong><br><br>` +
          `El maître verá tu solicitud y te asignará una mesa cuando esté disponible.<br><br>` +
          `Mantente cerca del restaurante.`
        : `Tu solicitud fue registrada.<br><br>` +
          `El maître te asignará una mesa cuando esté disponible.`,
      buttons: ['Entendido']
    });

    await alert.present();
  }

  /**
   * 🧪 [TESTING] Simular escaneo de QR para testing (sin cámara)
   * Verifica automáticamente la mesa asignada sin necesidad de escanear
   */
  async verificarMesaSimulada() {
    try {
      if (!this.mesaAsignada) {
        this.showToast('No tienes una mesa asignada todavía', 'warning');
        return;
      }

      const { data: mesa, error } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', this.mesaAsignada)
        .maybeSingle();

      if (error || !mesa) {
        await this.hapticService.vibrateError();
        this.showToast('Error al obtener datos de la mesa', 'danger');
        return;
      }

      const qrSimulado = `${mesa.numero},${mesa.capacidad},${mesa.tipo}`;
      
      console.log('🧪 [TESTING] Simulando escaneo QR de mesa:', qrSimulado);
      
      await this.procesarQRMesa(qrSimulado);
      
    } catch (error) {
      console.error('Error en verificación simulada:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al verificar la mesa', 'danger');
    }
  }
}