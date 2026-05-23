import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { EncuestaService } from 'src/app/services/encuesta.service';

@Component({
  selector: 'app-tab7-resultados',
  templateUrl: './tab7-resultados.page.html',
  styleUrls: ['./tab7-resultados.page.scss'],
  standalone: false,
})
export class Tab7ResultadosPage implements OnInit, OnDestroy {
  @ViewChild('tachoComida')   tachoComidaRef!: ElementRef<SVGElement>;
  @ViewChild('tachoServicio') tachoServicioRef!: ElementRef<SVGElement>;

  resultados: any = null;
  cargando = true;
  promediosArray: { nombre: string; valor: string; color: string }[] = [];

  private readonly STAR_COLORS: Record<number, string> = {
    1: '#ef4444', 2: '#f97316', 3: '#F48C06', 4: '#84cc16', 5: '#22c55e'
  };

  constructor(
    private encuestaService: EncuestaService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.cargarResultados();
  }

  ngOnDestroy() {}

  async cargarResultados() {
    this.cargando = true;
    try {
      this.resultados = await this.encuestaService.obtenerResultados();
      this.buildPromedios();
      setTimeout(() => this.drawTachos(), 150);
    } catch (e) {
      this.showToast('Error al cargar los resultados', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  buildPromedios() {
    if (!this.resultados?.promedios) return;
    const p = this.resultados.promedios;
    this.promediosArray = [
      { nombre: 'Comida',   valor: p.calidadComida,  color: '#F48C06' },
      { nombre: 'Servicio', valor: p.calidadServicio, color: '#4cc9f0' },
      { nombre: 'Ambiente', valor: p.ambiente,         color: '#a855f7' },
      { nombre: 'Precio',   valor: p.precioCalidad,    color: '#22c55e' },
    ];
  }

  drawTachos() {
    const d = this.resultados?.distribucion;
    if (!d) return;
    if (this.tachoComidaRef)
      this.drawTacho(
        this.tachoComidaRef.nativeElement,
        parseFloat(this.resultados.promedios.calidadComida),
        [d.calidadComida[1], d.calidadComida[2], d.calidadComida[3], d.calidadComida[4], d.calidadComida[5]]
      );
    if (this.tachoServicioRef)
      this.drawTacho(
        this.tachoServicioRef.nativeElement,
        parseFloat(this.resultados.promedios.calidadServicio),
        [d.calidadServicio[1], d.calidadServicio[2], d.calidadServicio[3], d.calidadServicio[4], d.calidadServicio[5]]
      );
  }

  private drawTacho(svg: SVGElement, value: number, counts: number[]) {
    // Limpiar
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const ns = 'http://www.w3.org/2000/svg';
    const cx = 140, cy = 148, r = 118;
    const colors = ['#ef4444','#f97316','#F48C06','#84cc16','#22c55e'];
    const total = counts.reduce((a, b) => a + b, 0);

    let currentAngle = Math.PI;

    // Segmentos coloreados
    counts.forEach((v, i) => {
      const sweep = total > 0 ? (v / total) * Math.PI : Math.PI / 5;
      const x1 = cx + r * Math.cos(currentAngle);
      const y1 = cy + r * Math.sin(currentAngle);
      const x2 = cx + r * Math.cos(currentAngle + sweep);
      const y2 = cy + r * Math.sin(currentAngle + sweep);
      const large = sweep > Math.PI ? 1 : 0;

      // Sector (pie slice)
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`);
      path.setAttribute('fill', colors[i]);
      path.setAttribute('opacity', '0.85');
      svg.appendChild(path);
      currentAngle += sweep;
    });

    // Recorte interior (efecto gauge)
    const innerR = r * 0.55;
    const cutout = document.createElementNS(ns, 'path');
    cutout.setAttribute('d', `M ${cx - r - 10} ${cy} Q ${cx} ${cy - r - 10} ${cx + r + 10} ${cy} L ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 0 0 ${cx - innerR} ${cy} Z`);
    cutout.setAttribute('fill', '#111118');
    svg.appendChild(cutout);

    // Borde exterior semiarco
    const arc = document.createElementNS(ns, 'path');
    arc.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`);
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke', 'rgba(255,255,255,0.06)');
    arc.setAttribute('stroke-width', '2');
    svg.appendChild(arc);

    // Aguja
    const needleAngle = Math.PI + ((value - 1) / 4) * Math.PI;
    const needleLen = r * 0.72;
    const nx = cx + needleLen * Math.cos(needleAngle);
    const ny = cy + needleLen * Math.sin(needleAngle);

    const needleShadow = document.createElementNS(ns, 'line');
    needleShadow.setAttribute('x1', String(cx)); needleShadow.setAttribute('y1', String(cy));
    needleShadow.setAttribute('x2', String(nx + 2)); needleShadow.setAttribute('y2', String(ny + 2));
    needleShadow.setAttribute('stroke', 'rgba(0,0,0,0.4)');
    needleShadow.setAttribute('stroke-width', '4');
    needleShadow.setAttribute('stroke-linecap', 'round');
    svg.appendChild(needleShadow);

    const needle = document.createElementNS(ns, 'line');
    needle.setAttribute('x1', String(cx)); needle.setAttribute('y1', String(cy));
    needle.setAttribute('x2', String(nx)); needle.setAttribute('y2', String(ny));
    needle.setAttribute('stroke', '#ffffff');
    needle.setAttribute('stroke-width', '3');
    needle.setAttribute('stroke-linecap', 'round');
    svg.appendChild(needle);

    // Pivot exterior
    const pivot = document.createElementNS(ns, 'circle');
    pivot.setAttribute('cx', String(cx)); pivot.setAttribute('cy', String(cy));
    pivot.setAttribute('r', '9');
    pivot.setAttribute('fill', '#ffffff');
    svg.appendChild(pivot);

    // Pivot interior
    const pivotInner = document.createElementNS(ns, 'circle');
    pivotInner.setAttribute('cx', String(cx)); pivotInner.setAttribute('cy', String(cy));
    pivotInner.setAttribute('r', '4');
    pivotInner.setAttribute('fill', '#111118');
    svg.appendChild(pivotInner);
  }

  starColor(s: number): string {
    return this.STAR_COLORS[s] ?? '#888';
  }

  async recargar() {
    await this.cargarResultados();
    this.showToast('Resultados actualizados', 'medium');
  }

  async handleRefresh(event: any) {
    await this.cargarResultados();
    event.target.complete();
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'medium') {
    const toast = await this.toastController.create({
      message, duration: 2500, color, position: 'bottom'
    });
    await toast.present();
  }
  getGaugeDashoffset(valor: string): number {
  return 201 - (parseFloat(valor) / 5) * 201;
}
screenHeight = '100dvh';
ionViewDidEnter() {
  const header = document.querySelector('ion-header') as HTMLElement;
  const headerH = header?.offsetHeight ?? 56;
  this.screenHeight = `calc(100dvh - ${headerH}px)`;
  this.drawTachos();
}

getPorcentajeVotos(votos: number, total: number): number {
  if (total === 0) return 0;
  return (votos / total) * 100;
}

// Calcular la moda (estrella más votada)
getModa(distribucion: any): number {
  let maxVotos = 0;
  let moda = 1;
  
  for (let i = 1; i <= 5; i++) {
    if (distribucion[i] > maxVotos) {
      maxVotos = distribucion[i];
      moda = i;
    }
  }
  
  return moda;
}
}