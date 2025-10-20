import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-juego-adivinanza',
  templateUrl: './juego-adivinanza.page.html',
  styleUrls: ['./juego-adivinanza.page.scss'],
  standalone: false
})
export class JuegoAdivinanzaPage implements OnInit {
  @Input() primerIntentoDisponible: boolean = false;
  @Output() juegoTerminado = new EventEmitter<{ gano: boolean; descuento: number; primerIntento: boolean }>();
  @Output() cerrar = new EventEmitter<void>();

  numeroSecreto: number = 0;
  intentoUsuario: number | null = null;
  mensaje: string = '';
  intentosRealizados: number = 0;
  maxIntentos: number = 5;
  juegoActivo: boolean = true;
  historialIntentos: { numero: number; pista: string }[] = [];
  esPrimerIntento: boolean = true;

  ngOnInit() {
    this.inicializarJuego();
  }

  inicializarJuego() {
    this.numeroSecreto = Math.floor(Math.random() * 50) + 1;
    this.intentoUsuario = null;
    this.mensaje = 'Adivina el número entre 1 y 50';
    this.intentosRealizados = 0;
    this.juegoActivo = true;
    this.historialIntentos = [];
    console.log('Número secreto (debug):', this.numeroSecreto);
  }

  verificarNumero() {
    if (this.intentoUsuario === null || this.intentoUsuario < 1 || this.intentoUsuario > 50) {
      this.mensaje = 'Por favor ingresa un número entre 1 y 50';
      return;
    }

    this.intentosRealizados++;
    
    if (this.intentoUsuario === this.numeroSecreto) {
      this.mensaje = `¡Felicitaciones! Adivinaste en ${this.intentosRealizados} intento(s)`;
      this.juegoActivo = false;
      this.historialIntentos.push({
        numero: this.intentoUsuario,
        pista: '🎯 ¡CORRECTO!'
      });
      
      setTimeout(() => {
        this.finalizarJuego(true);
      }, 1500);
    } else {
      let pista = '';
      const diferencia = Math.abs(this.intentoUsuario - this.numeroSecreto);
      
      if (diferencia <= 5) {
        pista = '🔥 ¡Muy caliente!';
      } else if (diferencia <= 10) {
        pista = '♨️ Caliente';
      } else if (diferencia <= 20) {
        pista = '❄️ Frío';
      } else {
        pista = '🧊 Muy frío';
      }

      if (this.intentoUsuario < this.numeroSecreto) {
        this.mensaje = `${pista} El número es MAYOR`;
      } else {
        this.mensaje = `${pista} El número es MENOR`;
      }

      this.historialIntentos.push({
        numero: this.intentoUsuario,
        pista: this.mensaje
      });

      if (this.intentosRealizados >= this.maxIntentos) {
        this.mensaje = `Perdiste. El número era ${this.numeroSecreto}`;
        this.juegoActivo = false;
        
        setTimeout(() => {
          this.finalizarJuego(false);
        }, 2000);
      }
    }

    this.intentoUsuario = null;
  }

  finalizarJuego(gano: boolean) {
    const resultado = {
      gano: gano,
      descuento: 15,
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