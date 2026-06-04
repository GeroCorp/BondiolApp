import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-juego-ruleta',
  templateUrl: './juego-ruleta.page.html',
  styleUrls: ['./juego-ruleta.page.scss'],
  standalone: false
})
export class JuegoRuletaPage implements OnInit {
  @Input() primerIntentoDisponible: boolean = false;
  @Output() juegoTerminado = new EventEmitter<{ gano: boolean; descuento: number; primerIntento: boolean }>();
  @Output() cerrar = new EventEmitter<void>();

  girando: boolean = false;
  resultado: string = '';
  rotacion: number = 0;
  intentosRealizados: number = 0;
  esPrimerIntento: boolean = this.primerIntentoDisponible;


  // Sectores de la ruleta (8 sectores)
  sectores = [
    { valor: '¡GANASTE!', color: '#4CAF50', gano: true },
    { valor: 'Perdiste', color: '#F44336', gano: false },
    { valor: '¡GANASTE!', color: '#4CAF50', gano: true },
    { valor: 'Perdiste', color: '#F44336', gano: false },
    { valor: '¡GANASTE!', color: '#4CAF50', gano: true },
    { valor: 'Perdiste', color: '#F44336', gano: false },
    { valor: 'Perdiste', color: '#F44336', gano: false },
    { valor: 'Perdiste', color: '#F44336', gano: false }
  ];

  ngOnInit() {}

  girarRuleta() {
    if (this.girando) return;

    this.girando = true;
    this.resultado = '';
    this.intentosRealizados++;

    // Calcular rotación aleatoria (mínimo 5 vueltas completas)
    const vueltasMinimas = 5;
    const vueltasExtra = Math.random() * 3;
    const totalVueltas = vueltasMinimas + vueltasExtra;
    
    // Elegir sector aleatorio
    const sectorIndex = Math.floor(Math.random() * this.sectores.length);
    const gradosPorSector = 360 / this.sectores.length;
    const anguloFinal = (sectorIndex * gradosPorSector) + (gradosPorSector / 2);
    
    // Rotación total
    this.rotacion = (totalVueltas * 360) + anguloFinal;

    // Esperar a que termine la animación
    setTimeout(() => {
      this.girando = false;
      const sectorGanador = this.sectores[sectorIndex];
      this.resultado = sectorGanador.valor;
      
      setTimeout(() => {
        this.finalizarJuego(sectorGanador.gano);
      }, 1000);
    }, 4000);
  }

  finalizarJuego(gano: boolean) {
    const resultado = {
      gano: gano,
      descuento: 20,
      primerIntento: this.esPrimerIntento
    };
    
    this.juegoTerminado.emit(resultado);
    this.esPrimerIntento = false;
  }

  reiniciarJuego() {
    this.esPrimerIntento = false;
    this.resultado = '';
    this.rotacion = 0;
  }

  cerrarJuego() {
    this.cerrar.emit();
  }
}