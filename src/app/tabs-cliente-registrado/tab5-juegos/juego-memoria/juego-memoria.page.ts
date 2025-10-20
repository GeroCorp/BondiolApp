import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

interface Carta {
  id: number;
  icono: string;
  volteada: boolean;
  encontrada: boolean;
}

@Component({
  selector: 'app-juego-memoria',
  templateUrl: './juego-memoria.page.html',
  styleUrls: ['./juego-memoria.page.scss'],
  standalone: false
})
export class JuegoMemoriaPage implements OnInit {
  @Input() primerIntentoDisponible: boolean = false;
  @Output() juegoTerminado = new EventEmitter<{ gano: boolean; descuento: number; primerIntento: boolean }>();
  @Output() cerrar = new EventEmitter<void>();

  cartas: Carta[] = [];
  cartaSeleccionada: Carta | null = null;
  bloqueado: boolean = false;
  movimientos: number = 0;
  paresEncontrados: number = 0;
  juegoIniciado: boolean = false;
  esPrimerIntento: boolean = true;

  iconos = ['pizza-outline', 'beer-outline', 'ice-cream-outline', 'cafe-outline', 'wine-outline', 'fast-food-outline'];

  ngOnInit() {
    this.inicializarJuego();
  }

  inicializarJuego() {
    this.cartas = [];
    this.movimientos = 0;
    this.paresEncontrados = 0;
    this.cartaSeleccionada = null;
    this.bloqueado = false;
    this.juegoIniciado = true;

    // Crear pares de cartas
    this.iconos.forEach((icono, index) => {
      this.cartas.push({
        id: index * 2,
        icono: icono,
        volteada: false,
        encontrada: false
      });
      this.cartas.push({
        id: index * 2 + 1,
        icono: icono,
        volteada: false,
        encontrada: false
      });
    });

    // Mezclar cartas
    this.cartas = this.cartas.sort(() => Math.random() - 0.5);
  }

  seleccionarCarta(carta: Carta) {
    if (this.bloqueado || carta.volteada || carta.encontrada) {
      return;
    }

    carta.volteada = true;

    if (!this.cartaSeleccionada) {
      this.cartaSeleccionada = carta;
    } else {
      this.bloqueado = true;
      this.movimientos++;

      if (this.cartaSeleccionada.icono === carta.icono) {
        // Par encontrado
        this.cartaSeleccionada.encontrada = true;
        carta.encontrada = true;
        this.paresEncontrados++;
        this.cartaSeleccionada = null;
        this.bloqueado = false;

        // Verificar si ganó
        if (this.paresEncontrados === this.iconos.length) {
          setTimeout(() => {
            this.finalizarJuego(true);
          }, 500);
        }
      } else {
        // No es par
        const carta1 = this.cartaSeleccionada;
        const carta2 = carta;

        setTimeout(() => {
          carta1.volteada = false;
          carta2.volteada = false;
          this.cartaSeleccionada = null;
          this.bloqueado = false;
        }, 1000);
      }
    }
  }

  finalizarJuego(gano: boolean) {
    const resultado = {
      gano: gano,
      descuento: 10,
      primerIntento: this.esPrimerIntento
    };
    
    this.juegoTerminado.emit(resultado);
    this.esPrimerIntento = false;
  }

  reiniciarJuego() {
    this.esPrimerIntento = false;
    this.inicializarJuego();
  }

  cerrarJuego() {
    this.cerrar.emit();
  }
}