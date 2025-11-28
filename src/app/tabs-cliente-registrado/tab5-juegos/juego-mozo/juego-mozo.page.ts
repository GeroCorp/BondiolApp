import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, ViewChild, ElementRef } from '@angular/core';
import { Motion } from '@capacitor/motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Posicion {
  x: number;
  y: number;
}

interface Obstaculo {
  x: number;
  y: number;
  tipo: 'patines' | 'banana' | 'aceite';
  icono: string;
}

@Component({
  selector: 'app-juego-mozo',
  templateUrl: './juego-mozo.page.html',
  styleUrls: ['./juego-mozo.page.scss'],
  standalone: false
})
export class JuegoMozoComponent implements OnInit, OnDestroy {
  @Input() primerIntentoDisponible: boolean = false;
  @Output() juegoTerminado = new EventEmitter<{
    gano: boolean;
    descuento: number;
    primerIntento: boolean;
  }>();
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('gameCanvas', { static: false }) canvasRef!: ElementRef<HTMLDivElement>;

  // Estado del juego
  juegoIniciado: boolean = false;
  juegoTerminado_: boolean = false;
  gano: boolean = false;
  mensaje: string = '';

  // Posiciones
  // El orden de las esquinas es empezando desde inferior derecha y en sentido horario
  esquinas: Posicion[] = [{x: 0, y: 0},{x: 30, y: 0},{x: 30, y: 30},{x: 0, y: 30}];
  mozo: Posicion = { x: 30, y: 30 };
  mesa: Posicion = { x: 0, y: 0 };
  obstaculos: Obstaculo[] = [];

  // Dimensiones
  canvasWidth: number = 0;
  canvasHeight: number = 0;
  mozoSize: number = 50;
  mesaSize: number = 60;
  obstaculoSize: number = 45;

  // Movimiento
  private velocidadX: number = 0;
  private velocidadY: number = 0;
  private sensibilidad: number = 0.2;
  private friction: number = 0.65;
  private maxVelocidad: number = 8;

  // Audio
  private audioInicio!: HTMLAudioElement;
  private audioFin!: HTMLAudioElement;
  private audioError!: HTMLAudioElement;

  // Control
  private animationFrame: any;
  private motionListener: any;
  private esPrimerIntento: boolean = true;

  constructor() {}

  async ngOnInit() {
    this.inicializarAudio();
  }

  ngOnDestroy() {
    this.detenerJuego();
  }

  inicializarAudio() {
    try {
      this.audioInicio = new Audio('assets/sounds/game_start.mp3');
      this.audioFin = new Audio('assets/sounds/game-win.mp3');
      this.audioError = new Audio('assets/sounds/game-error.mp3');
      
      // Configurar volumen
      this.audioInicio.volume = 0.5;
      this.audioFin.volume = 0.6;
      this.audioError.volume = 0.7;
    } catch (error) {
      console.warn('Error inicializando audio:', error);
    }
  }

  iniciarJuego() {
    if (this.juegoIniciado) return;

    this.juegoIniciado = true;
    this.juegoTerminado_ = false;
    this.gano = false;
    this.mensaje = '';

    // Obtener dimensiones del canvas
    setTimeout(() => {
      if (this.canvasRef) {
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        this.canvasWidth = rect.width;
        this.canvasHeight = rect.height;

        // Posicionar elementos
        this.posicionarElementos();
        
        // Reproducir sonido de inicio
        this.reproducirSonido(this.audioInicio);
        
        // Iniciar giroscopio
        this.initialiZeDeviceOrientation();
        
        // Iniciar loop del juego
        this.gameLoop();
      }
    }, 100);
  }

  posicionarElementos() {
    // Esquinas disponibles: [superior-izquierda, superior-derecha, inferior-derecha, inferior-izquierda]
    const esquinas = [
      { x: 30, y: 30 },                                              // Superior-izquierda
      { x: this.canvasWidth - this.mozoSize - 30, y: 30 },          // Superior-derecha
      { x: this.canvasWidth - this.mozoSize - 30, y: this.canvasHeight - this.mozoSize - 30 }, // Inferior-derecha
      { x: 30, y: this.canvasHeight - this.mozoSize - 30 }          // Inferior-izquierda
    ];

    // Pares de esquinas contrarias
    const pareesContrarias = [
      [0, 2], // Superior-izquierda vs Inferior-derecha
      [1, 3]  // Superior-derecha vs Inferior-izquierda
    ];

    // Elegir aleatoriamente un par de esquinas contrarias
    const parAleatorio = pareesContrarias[Math.floor(Math.random() * pareesContrarias.length)];
    
    // Decidir aleatoriamente cuál esquina para mozo y cuál para mesa
    const indicesMozoMesa = Math.random() < 0.5 ? 
      [parAleatorio[0], parAleatorio[1]] : 
      [parAleatorio[1], parAleatorio[0]];

    // Asignar posiciones
    this.mozo = {
      x: esquinas[indicesMozoMesa[0]].x,
      y: esquinas[indicesMozoMesa[0]].y
    };

    this.mesa = {
      x: esquinas[indicesMozoMesa[1]].x,
      y: esquinas[indicesMozoMesa[1]].y
    };

    // Generar obstáculos aleatorios en el centro
    this.generarObstaculos();
  }

  generarObstaculos() {
    this.obstaculos = [];
    
    const tipos: Array<'patines' | 'banana' | 'aceite'> = ['patines', 'banana', 'aceite'];
    const iconos = {
      patines: 'assets/images/patines.png',
      banana: 'assets/images/banana.png',
      aceite: 'assets/images/aceite.png'
    };

    // Área central donde aparecerán los obstáculos
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const radioDistribucion = Math.min(this.canvasWidth, this.canvasHeight) * 0.3;

    for (let i = 0; i < 3; i++) {
      const angulo = Math.random() * Math.PI * 2;
      const distancia = Math.random() * radioDistribucion;
      
      const obstaculo: Obstaculo = {
        x: centerX + Math.cos(angulo) * distancia - this.obstaculoSize / 2,
        y: centerY + Math.sin(angulo) * distancia - this.obstaculoSize / 2,
        tipo: tipos[i],
        icono: iconos[tipos[i]]
      };

      this.obstaculos.push(obstaculo);
    }
  }



  private orientationHandler = (event: DeviceOrientationEvent) => {
    this.handleDeviceOrientation(event);
  };

  private isNativeApp(): boolean {
    // Detecta si la app está corriendo en Capacitor (nativa) o en navegador
    return (window as any).capacitor !== undefined;
  }

  private initialiZeDeviceOrientation() {
    // Solo inicializar en apps nativas
    if (!this.isNativeApp()) {
      console.log('⚠️ DeviceOrientation deshabilitado - No es una app nativa');
      return;
    }

    console.log('📱 InicialiZando DeviceOrientation...');
    window.addEventListener('deviceorientation', this.orientationHandler);
    console.log('✅ DeviceOrientation listener registrado');
  }

   private handleDeviceOrientation(event: DeviceOrientationEvent) {
    const Y = event.alpha || 0; 
    const X = event.beta || 0;
    const Z = event.gamma || 0;
    

    // Si X baja, entonces, el muñeco sube
    this.velocidadY += (X - 0) * this.sensibilidad; // Ajustar según orientación

    // Si Z sube, entonces, el muñeco va a la derecha
    this.velocidadX += (Z - 0) * this.sensibilidad; // Ajustar según orientación

    // Capeamos la velocidad máxima
    this.velocidadX = Math.max(-this.maxVelocidad, Math.min(this.maxVelocidad, this.velocidadX));
    this.velocidadY = Math.max(-this.maxVelocidad, Math.min(this.maxVelocidad, this.velocidadY));
    

    console.log(`Orientaciones: X ${X.toFixed(1)}    Y ${Y.toFixed(1)}    Z ${Z.toFixed(1)}`);
  }

  gameLoop() {
    if (!this.juegoIniciado || this.juegoTerminado_) return;

    // Aplicar fricción
    this.velocidadX *= this.friction;
    this.velocidadY *= this.friction;

    // Actualizar posición
    this.mozo.x += this.velocidadX;
    this.mozo.y += this.velocidadY;

    // Verificar colisiones
    this.verificarColisiones();

    // Continuar loop
    this.animationFrame = requestAnimationFrame(() => this.gameLoop());
  }

  verificarColisiones() {
    // Colisión con bordes
    if (
      this.mozo.x <= 0 ||
      this.mozo.x + this.mozoSize >= this.canvasWidth ||
      this.mozo.y <= 0 ||
      this.mozo.y + this.mozoSize >= this.canvasHeight
    ) {
      this.perderJuego('¡Chocaste con el borde!');
      return;
    }

    // Colisión con obstáculos
    for (const obstaculo of this.obstaculos) {
      if (this.hayColision(
        this.mozo.x,
        this.mozo.y,
        this.mozoSize,
        obstaculo.x,
        obstaculo.y,
        this.obstaculoSize
      )) {
        this.perderJuego(`¡Tropezaste con ${this.getNombreObstaculo(obstaculo.tipo)}!`);
        return;
      }
    }

    // Llegada a la mesa
    if (this.hayColision(
      this.mozo.x,
      this.mozo.y,
      this.mozoSize,
      this.mesa.x,
      this.mesa.y,
      this.mesaSize
    )) {
      this.ganarJuego();
    }
  }

  hayColision(x1: number, y1: number, size1: number, x2: number, y2: number, size2: number): boolean {
    return (
      x1 < x2 + size2 &&
      x1 + size1 > x2 &&
      y1 < y2 + size2 &&
      y1 + size1 > y2
    );
  }

  getNombreObstaculo(tipo: string): string {
    const nombres: any = {
      patines: 'unos patines',
      banana: 'una cáscara de banana',
      aceite: 'una mancha de aceite'
    };
    return nombres[tipo] || 'un obstáculo';
  }

  async perderJuego(mensaje: string) {
    this.juegoTerminado_ = true;
    this.gano = false;
    this.mensaje = mensaje;
    this.velocidadX = 0;
    this.velocidadY = 0;

    // Reproducir sonido de error
    this.reproducirSonido(this.audioError);

    // Vibrar
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('Error con vibración:', error);
    }

    // Detener giroscopio
    this.detenerGiroscopio();

    // Emitir resultado después de 2 segundos
    setTimeout(() => {
      this.juegoTerminado.emit({
        gano: false,
        descuento: 0,
        primerIntento: this.esPrimerIntento && this.primerIntentoDisponible
      });
      this.esPrimerIntento = false;
    }, 2000);
  }

  async ganarJuego() {
    this.juegoTerminado_ = true;
    this.gano = true;
    this.mensaje = '¡Entregaste el pedido exitosamente!';
    this.velocidadX = 0;
    this.velocidadY = 0;

    // Reproducir sonido de victoria
    this.reproducirSonido(this.audioFin);

    // Vibración de éxito
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }, 200);
    } catch (error) {
      console.warn('Error con vibración:', error);
    }

    // Detener giroscopio
    this.detenerGiroscopio();

    // Emitir resultado (25% de descuento)
    setTimeout(() => {
      this.juegoTerminado.emit({
        gano: true,
        descuento: 25,
        primerIntento: this.esPrimerIntento && this.primerIntentoDisponible
      });
      this.esPrimerIntento = false;
    }, 2000);
  }

  reproducirSonido(audio: HTMLAudioElement) {
    try {
      audio.currentTime = 0;
      audio.play().catch(err => console.warn('Error reproduciendo audio:', err));
    } catch (error) {
      console.warn('Error con audio:', error);
    }
  }

  detenerGiroscopio() {
    if (this.motionListener) {
      this.motionListener.remove();
      this.motionListener = null;
    }
    window.removeEventListener('deviceorientation', this.orientationHandler);

  }

  detenerJuego() {
    this.juegoIniciado = false;
    this.juegoTerminado_ = true;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.detenerGiroscopio();

  }

  reiniciarJuego() {
    this.detenerJuego();
    this.esPrimerIntento = false;
    setTimeout(() => {
      this.iniciarJuego();
    }, 300);
  }

  cerrarJuego() {
    this.detenerJuego();
    this.cerrar.emit();
  }
}