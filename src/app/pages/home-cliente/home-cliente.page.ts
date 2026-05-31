import { ChangeDetectorRef, Component, effect, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

import { ClienteService } from 'src/app/services/cliente.service';
import { AuthService } from 'src/app/services/supabase';
import { Notification } from 'src/app/services/notification';
import { ListaEsperaService } from 'src/app/services/lista-espera.service';
import { HapticService } from 'src/app/services/haptic.service';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { ReservasService } from 'src/app/services/reservas.service';
import { environment } from 'src/environments/environment.prod';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';


@Component({
  selector: 'app-home-cliente',
  templateUrl: './home-cliente.page.html',
  styleUrls: ['./home-cliente.page.scss'],
  standalone: false,
})
export class HomeClientePage implements OnInit {
  cliente: any = null;
  enListaEspera = signal<boolean>(false);

  mesaAsignada = signal<number | null>(null);
  mesaVerificada = signal<boolean>(false);

  private pedidosSubscription: any = null;
  private mesaSubscription: any = null;
  private clienteEnEsperaSubscription: any = null;
  private initialized = false;
  isRegistrado = signal<boolean>(true);
  perfil = "cliente";
  private notificationService: Notification = inject(Notification);
  reservaActivaHoy: any = null;
  cargandoReserva: boolean = false;
  cargandoRecarga = signal<boolean>(false);

  juegosAccess = signal<boolean>(false);
  opinionesAccess = signal<boolean>(true);
  menuAccess = signal<boolean>(false);
  canPay = signal<boolean>(false);
  encuestaAccess = signal<boolean>(false);
  historialAccess = signal<boolean>(false);


  isDelivery = signal<boolean>(false);
  direccionDelivery: string = '';


  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private clienteService: ClienteService,
    private cd: ChangeDetectorRef,
    private listaEsperaService: ListaEsperaService,
    private hapticService: HapticService,
    private tipoClienteService: TipoClienteService,
    private reservasService: ReservasService,
    private customLoader: CustomLoaderService
  ) {


    // ✅ EFECTO: Actualizar estado de espera para registrados
    effect(() => {
      if (!this.tipoClienteService.isAnonimo()) {
        this.setDireccion();
        console.log("Entro a afterView");
        if(this.isDelivery() && this.direccionDelivery === ''){
          this.isDelivery.set(false)
        }
        // const access = localStorage.getItem('juegosAccess');
        // this.juegosAccess.set(access === 'true');
        // if (this.juegosAccess()){
        //   console.log("Acceso a juegos habilitado");
        //   this.showToast('¡Acceso a juegos habilitado!', 'success');
        // }
        const canPayStorage = localStorage.getItem('canPay');
        this.canPay.set(canPayStorage === 'true');
      }
    });

    // ✅ TIPO DE CLIENTE
    this.tipoClienteService.tipoCliente$.subscribe(tipo => {
      this.isRegistrado.set(tipo === 'registrado');
      console.log('👤 Tipo de cliente:', tipo);
    });

    // ✅ REACTIVO: Actualizar señales cuando cambian datos del cliente (ej. maitre asigna mesa)
    this.tipoClienteService.clienteData$.subscribe(data => {
      if (data && this.tipoClienteService.isAnonimo()) {
        const oldMesa = this.mesaAsignada();
        const oldMesaVerificada = this.mesaVerificada();
        this.mesaAsignada.set(data.mesa_asignada || null);
        this.enListaEspera.set(data.en_espera !== false);
        this.cliente = data;

        // Si tenía mesa y ahora la quitaron (pago confirmado), redirigir a login
        if (oldMesa && !data.mesa_asignada && this.initialized) {
          this.redirigirALogin('Pago confirmado. Redirigiendo al inicio...');
          return;
        }

        // Si se asignó mesa nueva después de inicializado, suscribirse a pedidos
        if (data.mesa_asignada && !oldMesa && !this.pedidosSubscription && this.initialized) {
          this.setupPedidosSuscripcion();
        }

        // Si la mesa cambió pero ya estaba verificada (re-asignación), refrescar accesos
        if (data.mesa_asignada && oldMesa && data.mesa_asignada !== oldMesa && this.initialized) {
          this.setupPedidosSuscripcion();
          this.actualizarAccesosSegunPedidos();
        }
      }
    });
  }

  setDireccion(){
    const rawDirection = this.clienteService.direccionDelivery();
    this.direccionDelivery = this.formatearDireccion(rawDirection);
  }

  formatearDireccion(direccion: string){
    if (!direccion){
      console.log("Direccion vacía");
    }
    let formateada = direccion.split(',')
    return formateada[0];
  }

  testMesa(){
    this.mesaVerificada.set(true);
  }

  private redirigirALogin(mensaje: string) {
    this.showToast(mensaje, 'success');
    setTimeout(() => {
      this.tipoClienteService.clearClienteData();
      this.router.navigate(['/login'], { replaceUrl: true });
    }, 1500);
  }
  
  async ngOnInit() {
    await this.customLoader.show('Cargando datos...');
    console.log('🏠 [HOME-CLIENTE] ngOnInit iniciado');
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    const fechaLocal = `${year}-${month}-${day}`;
    
    console.log('🗓️ FECHA ACTUAL EN LA APP:', {
      fechaLocal: fechaLocal,
      fechaISO: ahora.toISOString(),
      fechaLocaleString: ahora.toLocaleString('es-AR'),
      timeZoneOffset: ahora.getTimezoneOffset()
    });
    try {

      const { data: { session }, error } = await this.authService.client.auth.getSession();
      const hasSession = !error && !!session;

      if (!hasSession && !this.tipoClienteService.isAnonimo()) {
        console.error('❌ No hay sesión activa y no es cliente anónimo');
        await this.router.navigate(['/login'], { replaceUrl: true });
        return;
      }

      const storageDelivery = localStorage.getItem('esDelivery');
      if (storageDelivery !== null) {
        this.clienteService.setIsDelivery(true);
        this.isDelivery.set(true);
        this.direccionDelivery = localStorage.getItem('direccionDelivery')!;
        this.clienteService.setDireccionDelivery(this.direccionDelivery);
      }

      if (session?.user.id && !this.tipoClienteService.isAnonimo()) {
        // Cargar datos del cliente (dependencia para los otros)
        await this.cargarDatosCliente(session.user.id);
        // Ejecutar en paralelo los que dependen de this.cliente
        const [, , suscripcion] = await Promise.all([
          this.verificarReservaActiva(),
          this.verificarMesaAsignada(),
          this.clienteService.subscribeToClienteEnEspera(this.enListaEspera),
          
        ]);
        
        // Guardar suscripción para limpiar después
        this.clienteEnEsperaSubscription = suscripcion;

        // Suscribirse a cambios en historial de pedidos con callback
        await this.clienteService.subscribeToHistorialPedidos(() => this.actualizarAccesosSegunPedidos());

        // Suscribirse a cambios en la tabla clientes (realtime) para detectar liberación de mesa
        if (this.cliente?.id_cliente) {
          this.mesaSubscription = this.authService.client
            .channel(`cliente-mesa-${this.cliente.id_cliente}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'clientes',
                filter: `id_cliente=eq.${this.cliente.id_cliente}`
              },
              (payload: any) => {
                const newMesa = payload.new?.mesa_asignada;
                const oldMesa = payload.old?.mesa_asignada;
                if (oldMesa && !newMesa && this.initialized) {
                  this.redirigirALogin('Pago confirmado. Redirigiendo al inicio...');
                }
              }
            )
            .subscribe();
        }

        // Verificacion de accesos INICIALES
        await this.actualizarAccesosSegunPedidos();
        this.clienteService.isCLienteEnEspera(); // Verificar estado de espera al cargar la página

        this.enListaEspera.set(this.clienteService.clienteEnEspera());
        
      } else if (this.tipoClienteService.isAnonimo()) {
        const clienteData = this.tipoClienteService.getClienteData();
        if (clienteData) {
          this.cliente = clienteData;
          
          this.mesaAsignada.set(clienteData.mesa_asignada || null);
          this.enListaEspera.set(clienteData.en_espera !== false);
          this.mesaVerificada.set(false);
          
          if (clienteData.mesa_asignada) {
            const suscripcion = await this.clienteService.subscribeToHistorialPedidos(
              () => this.actualizarAccesosSegunPedidos()
            );
            this.pedidosSubscription = suscripcion;

            await this.actualizarAccesosSegunPedidos();
          }
        } else {
          console.warn('⚠️ Cliente anónimo sin datos locales; redirigiendo a ingreso-anonimo');
          await this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
          return;
        }
      }
      
    } catch (error) {
      console.error('❌ Error en ngOnInit:', error);
      this.showToast('Error al cargar la página', 'danger');
      this.router.navigate(['/login'], { replaceUrl: true });
    } finally {
      this.initialized = true;
      this.customLoader.hide();
    }
  }


  async setupPedidosSuscripcion() {
    if (this.pedidosSubscription) return;
    const suscripcion = await this.clienteService.subscribeToHistorialPedidos(
      () => this.actualizarAccesosSegunPedidos()
    );
    this.pedidosSubscription = suscripcion;
    await this.actualizarAccesosSegunPedidos();
  }

  ngOnDestroy() {
  console.log('🧹 [HOME-CLIENTE] ngOnDestroy - limpiando recursos');
  
  this.tipoClienteService.stopRealtime();
  
  if (this.pedidosSubscription) {
    this.pedidosSubscription.unsubscribe();
  }
  
  if (this.mesaSubscription) {
    this.mesaSubscription.unsubscribe();
  }
  
  if (this.clienteEnEsperaSubscription) {
    this.clienteEnEsperaSubscription.unsubscribe();
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
    this.mesaAsignada.set(clienteSeleccionado.mesa_asignada);
    this.enListaEspera.set(false);
    this.mesaVerificada.set(false);
  } else {
    this.mesaAsignada.set(null);
    this.enListaEspera.set(true);
    this.mesaVerificada.set(false);
  }
  
  this.cd.detectChanges();
  
  // Mostrar mensaje apropiado
  if (this.mesaAsignada()) {
    this.showToast(
      `Bienvenido ${clienteSeleccionado.nombre}. Mesa ${this.mesaAsignada()} asignada. Escanea el QR para verificar.`,
      'success'
    );
  }
  
  this.router.navigate(['/home-cliente']);
}

  // Métodos para verificar acceso a funcionalidades
  async puedeAccederJuegos(): Promise<boolean> {
    // TODO: Verificar que el cliente tenga un pedido activo (no pagado)
    let estado = await this.clienteService.estadoUltimoPedido();
    console.log("ACCESO A JUEGOS: ", estado !== 'pagado');
    return estado && estado !== 'pagado';
  }

  async puedeAccederAmenu(): Promise<boolean> {
    // Si tiene un pedido activo no podrá visualizar el menú para agregar un pedido nuevo
    let estado = await this.clienteService.estadoUltimoPedido();
    console.log("Estado del ultimo pedido: ", estado);
    console.log("ACCESO A MENÚ: ", estado == 'pagado' || estado == null || estado == 'rechazado');
    return estado == 'pagado' || estado == null || estado == 'rechazado';
  }

  async accesoAOpiniones(): Promise<boolean> {
    // Condición: No estar en lista de espera
    const notEnEspera = !this.enListaEspera();
    
    if (!notEnEspera) {
      return false; // Si está en lista de espera, NO puede acceder
    }
    
    // Si no tiene mesa asignada, puede acceder
    if (!this.mesaAsignada()) {
      return true;
    }
    
    // Para anónimos, permitir acceso si tiene mesa asignada y no está en espera
    if (this.tipoClienteService.isAnonimo()) {
      return true;
    }
    
    // Si TIENE mesa asignada, solo puede acceder si el pedido activo está entrega_confirmada
    const estadoPedido = await this.clienteService.estadoUltimoPedido();
    const access = estadoPedido === 'entrega_confirmada';
    
    console.log("Acceso a opiniones (AND): ", access, " (notEnEspera:", notEnEspera, ", mesaAsignada:", this.mesaAsignada(), ", estadoPedido:", estadoPedido, ")");
    return access;
  }

  async puedePedirCuenta() {
    // Solo si tiene un pedido activo entregado (no pagado)
    let estado = await this.clienteService.estadoUltimoPedido();
    console.log("ACCESO A PEDIR CUENTA: ", estado === 'entrega_confirmada');
    return estado === 'entrega_confirmada';
  }

  /**
   * ✅ NUEVO: Recalcular accesos cuando hay cambios en pedidos
   * Se ejecuta cada vez que se detecta un cambio en la tabla pedidos
   */
  async actualizarAccesosSegunPedidos(): Promise<void> {
    try {
      console.log('🔄 Recalculando accesos según cambios en pedidos...');

      const estado = await this.clienteService.estadoUltimoPedido();
      if (estado === 'rechazado') {
        this.showToast(
          '⚠️ Tu pedido fue rechazado. Podés modificarlo desde el menú.',
          'danger'
        );
      }
      
      const [puedoJuegos, puedoOpiniones, puedoMenu, puedoCuenta] = await Promise.all([
        this.puedeAccederJuegos(),
        this.accesoAOpiniones(),
        this.puedeAccederAmenu(),
        this.puedePedirCuenta()
      ]);

      this.opinionesAccess.set(puedoOpiniones);
      this.juegosAccess.set(puedoJuegos);
      this.menuAccess.set(puedoMenu);
      this.canPay.set(puedoCuenta);

      // Encuesta: para anónimos, siempre accesible cuando tiene mesa asignada
      if (this.tipoClienteService.isAnonimo()) {
        this.encuestaAccess.set(!!this.mesaAsignada() && !this.enListaEspera());
      } else {
        this.encuestaAccess.set(puedoCuenta);
      }

      // Historial (Mi pedido): bloqueado si no hay pedido o fue rechazado
      this.historialAccess.set(estado !== null && estado !== 'rechazado');

      console.log('✅ Accesos actualizados:', {
        juegos: puedoJuegos,
        opiniones: puedoOpiniones,
        menu: puedoMenu,
        pedirCuenta: puedoCuenta
      });
    } catch (error) {
      console.error('❌ Error actualizando accesos:', error);
    }
  }

  async cargarDatosCliente(userId: any) {
  try {

    this.cliente = await this.clienteService.getCliente(userId);
    this.tipoClienteService['tipoClienteSubject'].next('registrado');
    this.tipoClienteService['clienteData'].next(this.cliente);
    this.notificationsInit();

  } catch (error) {
    console.error('❌ Error:', error);
    this.showToast('Error al cargar datos', 'danger');
    setTimeout(async () => {
      await this.authService.logout();
      await this.router.navigate(['/login'], { replaceUrl: true });
    }, 2000);
  }
}

  async notificationsInit(){
    let id; 
    if (!this.cliente.id_cliente){
      // Si no hay id_cliente, intentar con anon id
      id = this.cliente.id_clienteanonimo.toString();
    }else{
      id = this.cliente.id_cliente.toString();
    };
    this.notificationService.setExternalUserId( id || '');
  }

  async verificarMesaAsignada() {
    try {

        const mesa = await this.clienteService.getNroMesa(this.cliente.id_cliente);
        this.mesaAsignada.set(mesa);
        console.log('🏠 Mesa asignada al cliente registrado:', mesa);
        
        if (mesa) {
          this.enListaEspera.set(false);
          // ✅ NO cambiar mesaVerificada aquí
        }
      
    } catch (error) {
      console.error('❌ Error verificando mesa asignada:', error);
    }
  }

  /**
   * Verificar y solicitar permisos de cámara
   */
  async checkPermissions(): Promise<boolean> {
    try {
      console.log('📷 Verificando permisos de cámara...');
      
      // Verificar permisos actuales
      const currentPermissions = await BarcodeScanner.checkPermissions();
      console.log('Permisos actuales:', currentPermissions);
      
      if (currentPermissions.camera === 'granted') {
        console.log('✅ Permisos de cámara ya concedidos');
        return true;
      }
      
      if (currentPermissions.camera === 'denied') {
        this.showToast('Los permisos de cámara fueron denegados. Ve a configuración de la app para habilitarlos.', 'danger');
        return false;
      }
      
      // Solicitar permisos
      console.log('📱 Solicitando permisos de cámara...');
      const requestedPermissions = await BarcodeScanner.requestPermissions();
      console.log('Permisos solicitados:', requestedPermissions);
      
      if (requestedPermissions.camera === 'granted') {
        console.log('✅ Permisos de cámara concedidos');
        this.showToast('Permisos de cámara concedidos', 'success');
        return true;
      } else {
        console.log('❌ Permisos de cámara denegados');
        this.showToast('Se necesitan permisos de cámara para escanear códigos QR', 'danger');
        return false;
      }
      
    } catch (error) {
      console.error('Error verificando permisos:', error);
      this.showToast('Error al verificar permisos de cámara', 'danger');
      return false;
    }
  }

  async escanearQRMesa() {
    try {
      // Usar la función checkPermissions mejorada
      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        return;
      }

      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable().catch(() => ({ available: false }));
      if (!available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        this.showToast('Instalando módulo de escaneo. Escaneá de nuevo.', 'medium');
        return;
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
      // Usar la función checkPermissions mejorada
      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        return;
      }

      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable().catch(() => ({ available: false }));
      if (!available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        this.showToast('Instalando módulo de escaneo. Escaneá de nuevo.', 'medium');
        return;
      }

      const result = await BarcodeScanner.scan();
      if (!(result.barcodes && result.barcodes.length > 0)) {
        await this.hapticService.vibrateError();
        this.showToast('No se detectó ningún QR', 'danger');
      } 

      const clientAlreadyInList = await this.checkSecondQrScan();

      if (clientAlreadyInList){
        return;
      }

      const qrData = result.barcodes[0].displayValue;
      this.opinionesAccess.set(false);
      if (qrData !== '/lista-espera-cliente') {
        await this.hapticService.vibrateError();
        this.showToast('QR inválido para lista de espera', 'danger');
        return;
      }
      this.router.navigate([qrData]);
      
    } catch (err: any) {
      console.error('Error al escanear QR:', err);
      await this.hapticService.vibrateError();
      this.showToast('Error al escanear: ' + err.message, 'danger');
    }
  }

  /**
   * Función para verificar si el cliente ya estuvo en la lista de espera hoy
   * En caso de que ya haya estado, habilita la encuesta
   * @returns Boolean
   */
  async checkSecondQrScan(){
    
    const listaDelDia = await this.listaEsperaService.getListaDelDia();

    const nombreCompleto = [this.cliente?.nombre, this.cliente?.apellido]
      .filter(Boolean)
      .join(' ')
      .trim();

    const clienteYaEnLista = listaDelDia.some((item: any) => {
      return (item.nombre_cliente || '').trim().toLowerCase() === nombreCompleto.toLowerCase();
    });

    if (!clienteYaEnLista){
      console.log("Cliente habilitado para entrar en lista de espera.");
      return false;
    }

    this.showToast('¡Ya puedes ver los resultados de las encuestas!.', 'success');
    this.opinionesAccess.set(true);

    return true;
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

      if (this.mesaAsignada() && this.mesaAsignada() !== numeroMesa) {
        this.showToast(
          `❌ Esta no es tu mesa asignada. Tu mesa es la ${this.mesaAsignada()}, pero escaneaste la mesa ${numeroMesa}`,
          'danger'
        );
        return;
      }

      if (!this.mesaAsignada()) {
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

      // Cuidado con los valores en la BD, parece que algunos valores están cambiados #CAMBIAR DATOS DE LOS QR EN README
      if (mesa.cantidad !== capacidad || mesa.tipo !== tipo) {
        console.log('❌ Datos del QR no coinciden con la mesa registrada:', {
          qr: { numeroMesa, capacidad, tipo },
          db: { numero: mesa.numero, cantidad: mesa.cantidad, tipo: mesa.tipo, id: mesa.id }
        });
        await this.hapticService.vibrateError();
        this.showToast(`Los datos del QR no coinciden con la mesa registrada`, 'danger');
        return;
      }

      // ✅ NO llamar a setMesa si ya está asignada
      if (!this.tipoClienteService.isAnonimo() && this.mesaAsignada()) {
        // Solo verificar para registrados
        console.log('✅ Mesa ya asignada, solo verificando QR');
      } else {
        await this.clienteService.setMesa(clientId, numeroMesa);
      }

      // ✅ MARCAR COMO VERIFICADA
      this.mesaVerificada.set(true);
      this.enListaEspera.set(false);

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

  async recargarDatos() {
    try {
      this.cargandoRecarga.set(true);
      
      // Refrescar datos del cliente
      await this.tipoClienteService.refreshClienteData().catch(() => {});
      
      // Actualizar datos locales
      const clienteData = this.tipoClienteService.getClienteData();
      if (clienteData) {
        this.cliente = clienteData;
        this.mesaAsignada.set(clienteData.mesa_asignada || null);
        this.enListaEspera.set(clienteData.en_espera !== false);
      }
      
      // Recargar reservas si es registrado
      if (this.isRegistrado()) {
        await this.verificarReservaActiva();
      }

      if (!this.mesaAsignada()) {
        this.mesaVerificada.set(false);
      }
      this.showToast('Datos actualizados correctamente', 'success');
    } catch (error) {
      console.error('Error al recargar datos:', error);
      this.showToast('Error al actualizar datos', 'danger');
    } finally {
      this.cargandoRecarga.set(false);
    }
  }

    async logout() {
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

  // Delivery
  // Al activar el modo delivery mostrar mapa para seleccionar dirección
  async pedirDelivery() {
    this.isDelivery.set(true);
    this.clienteService.setIsDelivery(true);

    this.router.navigate(['/tabs-cliente-registrado/tab9-delivery']);
  }
  // Redirecciones con verificación

  verMenu() {

    this.router.navigate(["/tabs-cliente-registrado/tab1-menu"]);
  }
  hacerConsulta() {
    if (this.isDelivery()){
      this.router.navigate(["/tabs-cliente-registrado/tab3-consulta/chat-delivery"]);
    }else {
      this.router.navigate(["/tabs-cliente-registrado/tab3-consulta"]);
    }
  }

  verHistorial(){
    // this.loadHistorialPedidos();
    this.router.navigate(["/tabs-cliente-registrado/tab4-historial"]);
  }

  verJuegos() {
      this.router.navigate(['/tabs-cliente-registrado/tab5-juegos']);
    }


  async solicitarCuenta() {
    this.router.navigate(['/tabs-cliente-registrado/tab8-cuenta']);
  }


    verEncuesta() {
    this.router.navigate(['/tabs-cliente-registrado/tab6-encuesta']);
  }

  verResultados() {
    this.router.navigate(['/tabs-cliente-registrado/tab7-resultados']);
  }

  async verReservas() {
  console.log('🎯 [DEBUG] verReservas llamado');
  console.log('📍 [DEBUG] Router disponible:', !!this.router);
  console.log('📍 [DEBUG] URL actual:', this.router?.url);
  
  try {
    console.log('🚀 [DEBUG] Iniciando navegación a /crear-reserva');
    
    const result = await this.router.navigate(['/crear-reserva']);
    
    console.log('✅ [DEBUG] Resultado navegación:', result);
    
    if (!result) {
      console.error('❌ [DEBUG] Navegación falló - verificar routing');
      this.showToast('Error: No se pudo navegar a crear reserva', 'danger');
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Error en navegación:', error);
    this.showToast('Error de navegación: ' + error, 'danger');
  }
}

/**
 * ✅ NUEVO: Ver mis reservas existentes
 */
async verMisReservas() {
  if (!this.cliente?.id_cliente) {
    this.showToast('Error: No se pudo obtener tu ID', 'danger');
    return;
  }

  const resultado = await this.reservasService.getReservasCliente(this.cliente.id_cliente);
  
  if (resultado.success && resultado.data.length > 0) {
    // Aquí podrías navegar a una página de listado de reservas
    // o mostrar un modal con las reservas
    this.mostrarModalReservas(resultado.data);
  } else {
    this.showToast('No tienes reservas registradas', 'medium');
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
        this.mesaAsignada.set(null);
        this.mesaVerificada.set(false);
        this.enListaEspera.set(true);

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

        this.notificationService.sendNotificationToPerfil(
          "maitre",
          "Nuevo cliente en lista de espera",
          `Cliente ${this.cliente?.nombre} se ha unido a la lista de espera.`
        )

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
        ? `Tu ID de lista: ${clienteId}` +
          `El maître verá tu solicitud y te asignará una mesa cuando esté disponible.` +
          `Mantente cerca del restaurante.`
        : `Tu solicitud fue registrada.` +
          `El maître te asignará una mesa cuando esté disponible.`,
          cssClass: 'custom-html-alert',
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
      if (!this.mesaAsignada()) {
        this.showToast('No tienes una mesa asignada todavía', 'warning');
        return;
      }

      const { data: mesa, error } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', this.mesaAsignada())
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

  async verificarReservaActiva() {
    if (!this.cliente?.id_cliente || !this.isRegistrado()) {
      return;
    }

  try {
    this.cargandoReserva = true;
    
    const reserva = await this.reservasService.getReservaActivaHoy(this.cliente.id_cliente);
    
    if (reserva) {
      const numeroMesa = reserva.mesa?.numero || reserva.mesa_id || 'N/A';
      
      console.log('🎯 Reserva aprobada encontrada:', {
        id: reserva.id,
        fecha: reserva.fecha_reserva,
        hora: reserva.hora_reserva,
        mesa_numero: numeroMesa,
        fecha_expiracion: reserva.fecha_expiracion
      });
      
      // ✅ VALIDAR EXPIRACIÓN LOCALMENTE
      if (reserva.fecha_expiracion) {
        const ahora = new Date();
        const fechaExpiracion = new Date(reserva.fecha_expiracion);
        
        const tiempoRestanteMs = fechaExpiracion.getTime() - ahora.getTime();
        
        console.log('⏰ Validación de expiración:', {
          ahora: ahora.toLocaleString('es-AR'),
          fechaExpiracion: fechaExpiracion.toLocaleString('es-AR'),
          tiempoRestanteMin: Math.round(tiempoRestanteMs / 60000),
          expirada: tiempoRestanteMs <= 0
        });
        
        // 🔥 SI EXPIRÓ: Ocultar card y marcar como expirada
        if (tiempoRestanteMs <= 0) {
          console.log('⏰ RESERVA EXPIRADA - Ocultando card');
          
          await this.reservasService.expirarReserva(reserva.id!);
          
          this.reservaActivaHoy = null;
          this.cd.detectChanges();
          
          this.showToast(
            '⏰ Tu reserva ha expirado. No confirmaste llegada a tiempo.',
            'danger'
          );
          
          return;
        }
      }
      
      // 🔥 VERIFICAR SI YA TIENE MESA ASIGNADA Y VERIFICADA
      if (this.mesaAsignada() && this.mesaVerificada() && this.mesaAsignada() === reserva.mesa_id) {
        console.log('✅ Mesa ya verificada, ocultando card');
        this.reservaActivaHoy = null;
        this.cd.detectChanges();
        return;
      }

      // 🔥 TESTING MODE: Mostrar SIEMPRE (sin validar horarios)
      if (environment.reservas.testing) {
        console.log('🔥 TESTING MODE - Mostrando card inmediatamente');
        this.reservaActivaHoy = reserva;
        this.cd.detectChanges();
        return;
      }

      // 🔒 PRODUCCIÓN: Validar ventana de activación (1 hora antes)
      const ahora = new Date();
      const [fecha, hora] = [reserva.fecha_reserva, reserva.hora_reserva];
      
      const [year, month, day] = fecha.split('-').map(Number);
      const horaParts = hora.split(':');
      const hours = parseInt(horaParts[0], 10);
      const minutes = parseInt(horaParts[1], 10);
      
      // 🔥 HORA DE LA RESERVA
      const horaReserva = new Date(year, month - 1, day, hours, minutes, 0);
      
      // 🔥 VENTANA DE ACTIVACIÓN: 1 hora antes de la reserva
      const ventanaActivacion = this.reservasService['VENTANA_ACTIVACION_HORAS'] || 1;
      const horaInicio = new Date(horaReserva.getTime() - (ventanaActivacion * 60 * 60 * 1000));
      
      // 🔥 HORA MÁXIMA: hora_reserva + tolerancia
      const tolerancia = this.reservasService['TOLERANCIA_MINUTOS'] || 45;
      const horaMaxima = new Date(horaReserva.getTime() + (tolerancia * 60 * 1000));
      
      console.log('⏰ Validación de horario (PRODUCCIÓN):', {
        horaInicio: horaInicio.toLocaleString('es-AR'),
        horaReserva: horaReserva.toLocaleString('es-AR'),
        horaMaxima: horaMaxima.toLocaleString('es-AR'),
        ahora: ahora.toLocaleString('es-AR'),
        dentroVentana: ahora >= horaInicio && ahora <= horaMaxima
      });
      
      // 🔥 MOSTRAR CARD: Desde 1 hora antes hasta hora_reserva + tolerancia
      if (ahora >= horaInicio && ahora <= horaMaxima) {
        console.log('🎯 ✅ DENTRO DE VENTANA - Mostrando card');
        this.reservaActivaHoy = reserva;
      } else if (ahora > horaMaxima) {
        console.log('⏰ Fuera de ventana (expiró) - Ocultando');
        await this.reservasService.expirarReserva(reserva.id!);
        this.reservaActivaHoy = null;
      } else {
        console.log('⏰ Aún no abre la ventana - Card oculto');
        this.reservaActivaHoy = null;
      }
    } else {
      console.log('❌ No hay reserva aprobada hoy');
      this.reservaActivaHoy = null;
    }
    
  } catch (error) {
    console.error('❌ Error verificando reserva activa:', error);
    this.reservaActivaHoy = null;
  } finally {
    this.cargandoReserva = false;
    this.cd.detectChanges();
  }
}
/**
 * ✅ NUEVO: Activar reserva y asignar mesa
 */
async activarReserva() {
  if (!this.reservaActivaHoy) {
    this.showToast('No hay reserva activa', 'warning');
    return;
  }

  const alert = await this.alertController.create({
    header: '🎯 Activar Reserva',
    message: `¿Confirmas que llegaste al restaurante para tu reserva?
      Mesa: ${this.reservaActivaHoy.mesa.numero}
      Hora: ${this.reservaActivaHoy.hora_reserva}
      Personas: ${this.reservaActivaHoy.cantidad_personas}
      Tu mesa será asignada y verificada automáticamente.`,
      cssClass: 'custom-html-alert',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Confirmar Llegada',
        handler: async () => {
          await this.procesarActivacionReserva();
        }
      }
    ]
  });

  await alert.present();
}

/**
 * Procesar la activación de la reserva
 */
private async procesarActivacionReserva() {
  try {
    this.cargandoReserva = true;

    const resultado = await this.reservasService.activarReservaYAsignarMesa(
      this.reservaActivaHoy.id
    );

    if (resultado.success) {
      // ✅ ACTUALIZAR DATOS LOCALES
      this.mesaAsignada.set(resultado.data.mesa_id);
      this.enListaEspera.set(false);
      
      // 🔑 CLAVE: Mesa auto-verificada sin escanear QR
      this.mesaVerificada.set(resultado.data.mesa_verificada || true);
      
      this.reservaActivaHoy = null;

      await this.hapticService.vibrateSuccess();
      
      this.showToast(
        `✅ ¡Bienvenido! Mesa ${this.mesaAsignada()} activada correctamente\n` +
        `Ya puedes acceder a todas las funcionalidades`,
        'success'
      );

      // Recargar datos del cliente
      await this.tipoClienteService.refreshClienteData();
      
      // Forzar actualización de la vista
      this.cd.detectChanges();
      
    } else {
      await this.hapticService.vibrateError();
      this.showToast(
        resultado.error || 'Error al activar la reserva',
        'danger'
      );
    }

  } catch (error) {
    console.error('Error activando reserva:', error);
    await this.hapticService.vibrateError();
    this.showToast('Error al procesar la reserva', 'danger');
  } finally {
    this.cargandoReserva = false;
    this.cd.detectChanges();
  }
}

async mostrarModalReservas(reservas: any[]) {
  const reservasHtml = reservas.map(r => `
      Mesa: ${r.mesa.numero} 
      Fecha: ${r.fecha_reserva} 
      Hora: ${r.hora_reserva}
      Personas: ${r.cantidad_personas}
      Estado: ${this.getTextoEstadoReserva(r.estado)}
  `).join('');

  const alert = await this.alertController.create({
    header: '📅 Mis Reservas',
    message: reservasHtml,
    cssClass: 'custom-html-alert',
    buttons: ['Cerrar']
  });

  await alert.present();
}

private getColorReserva(estado: string): string {
  const colores: any = {
    pendiente: '#ffc409',
    aprobada: '#2dd36f',
    rechazada: '#eb445a',
    activa: '#3880ff',
    completada: '#92949c',
    expirada: '#92949c'
  };
  return colores[estado] || '#92949c';
}

private getTextoEstadoReserva(estado: string): string {
  const textos: any = {
    pendiente: '⏳ Pendiente de aprobación',
    aprobada: '✅ Aprobada',
    rechazada: '❌ Rechazada',
    activa: '🟢 Activa',
    completada: '✔️ Completada',
    expirada: '⏰ Expirada'
  };
  return textos[estado] || estado;
}
}