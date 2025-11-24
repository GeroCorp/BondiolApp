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
  templateUrl: './juego-mozo.component.html',
  styleUrls: ['./juego-mozo.component.scss'],
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
  private sensibilidad: number = 15;
  private friction: number = 0.95;
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
      this.audioInicio = new Audio('assets/sounds/game-start.mp3');
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
        this.iniciarGiroscopio();
        
        // Iniciar loop del juego
        this.gameLoop();
      }
    }, 100);
  }

  posicionarElementos() {
    // Mozo en esquina superior izquierda
    this.mozo = {
      x: 30,
      y: 30
    };

    // Mesa en esquina inferior derecha
    this.mesa = {
      x: this.canvasWidth - this.mesaSize - 30,
      y: this.canvasHeight - this.mesaSize - 30
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

  async iniciarGiroscopio() {
    try {
      // ✅ CORRECCIÓN: Motion.addListener solicita permisos automáticamente
      this.motionListener = await Motion.addListener('accel', (event) => {
        if (!this.juegoIniciado || this.juegoTerminado_) return;

        // Actualizar velocidad basada en aceleración
        // Invertir x e y según la orientación del dispositivo
        this.velocidadX += event.acceleration.y * this.sensibilidad;
        this.velocidadY += event.acceleration.x * this.sensibilidad;

        // Limitar velocidad máxima
        this.velocidadX = Math.max(-this.maxVelocidad, Math.min(this.maxVelocidad, this.velocidadX));
        this.velocidadY = Math.max(-this.maxVelocidad, Math.min(this.maxVelocidad, this.velocidadY));
      });

      console.log('✅ Giroscopio iniciado correctamente');
    } catch (error) {
      console.error('Error iniciando giroscopio:', error);
      
      // Mostrar mensaje al usuario si falla el giroscopio
      this.mensaje = 'No se pudo acceder al giroscopio del dispositivo';
      this.juegoTerminado_ = true;
      this.juegoIniciado = false;
    }
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