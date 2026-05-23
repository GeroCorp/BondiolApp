import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { EncuestaService } from 'src/app/services/encuesta.service';
import { Chart } from 'chart.js/auto';
@Component({
  selector: 'app-tab7-resultados',
  templateUrl: './tab7-resultados.page.html',
  styleUrls: ['./tab7-resultados.page.scss'],
  standalone: false,
})
export class Tab7ResultadosPage implements OnInit, OnDestroy {
  @ViewChild('radarCanvas')     radarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutCanvas')  doughnutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barComidaCanvas') barComidaCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barServicioCanvas') barServicioCanvas!: ElementRef<HTMLCanvasElement>;

  resultados: any = null;
  cargando = true;

  private charts: Chart[] = [];

  constructor(
    private encuestaService: EncuestaService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.cargarResultados();
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  private destroyCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  async cargarResultados() {
    this.cargando = true;
    this.destroyCharts();
    try {
      this.resultados = await this.encuestaService.obtenerResultados();
      // Espera que Angular renderice los canvas antes de dibujar
      setTimeout(() => this.buildCharts(), 100);
    } catch (error) {
      console.error('Error cargando resultados:', error);
      this.showToast('Error al cargar los resultados', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  buildCharts() {
    if (!this.resultados) return;
    const p = this.resultados.promedios;
    const d = this.resultados.distribucion;
    const total = this.resultados.total;

    // ── Radar: promedios ──
    if (this.radarCanvas) {
      const c = new Chart(this.radarCanvas.nativeElement, {
        type: 'radar',
        data: {
          labels: ['Comida', 'Servicio', 'Ambiente', 'Precio/Calidad'],
          datasets: [{
            label: 'Promedio',
            data: [p.calidadComida, p.calidadServicio, p.ambiente, p.precioCalidad],
            backgroundColor: 'rgba(244, 140, 6, 0.2)',
            borderColor: '#F48C06',
            pointBackgroundColor: '#F48C06',
            pointRadius: 5,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              min: 0, max: 5,
              ticks: { stepSize: 1, color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
              grid: { color: 'rgba(255,255,255,0.1)' },
              angleLines: { color: 'rgba(255,255,255,0.1)' },
              pointLabels: { color: '#ffffff', font: { size: 12 } },
            }
          },
          plugins: { legend: { display: false } }
        }
      });
      this.charts.push(c);
    }

    // ── Doughnut: recomendación ──
    if (this.doughnutCanvas) {
      const c = new Chart(this.doughnutCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Sí', 'No'],
          datasets: [{
            data: [this.resultados.recomendaria.si, this.resultados.recomendaria.no],
            backgroundColor: ['#22c55e', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 8,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed} (${Math.round((ctx.parsed / total) * 100)}%)`
              }
            }
          }
        }
      });
      this.charts.push(c);
    }

    // ── Bar: calidad comida ──
    if (this.barComidaCanvas) {
      const c = new Chart(this.barComidaCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: ['★ 1', '★ 2', '★ 3', '★ 4', '★ 5'],
          datasets: [{
            label: 'Respuestas',
            data: [1, 2, 3, 4, 5].map(i => d.calidadComida[i] ?? 0),
            backgroundColor: ['#ef4444','#f97316','#F48C06','#84cc16','#22c55e'],
            borderRadius: 8,
            borderSkipped: false,
          }]
        },
        options: this.barOptions()
      });
      this.charts.push(c);
    }

    // ── Bar: calidad servicio ──
    if (this.barServicioCanvas) {
      const c = new Chart(this.barServicioCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: ['★ 1', '★ 2', '★ 3', '★ 4', '★ 5'],
          datasets: [{
            label: 'Respuestas',
            data: [1, 2, 3, 4, 5].map(i => d.calidadServicio[i] ?? 0),
            backgroundColor: ['#ef4444','#f97316','#F48C06','#84cc16','#22c55e'],
            borderRadius: 8,
            borderSkipped: false,
          }]
        },
        options: this.barOptions()
      });
      this.charts.push(c);
    }
  }

  private barOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: {
          ticks: { color: 'rgba(255,255,255,0.7)' },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: 'rgba(255,255,255,0.4)', stepSize: 1 },
          grid: { color: 'rgba(255,255,255,0.07)' },
        }
      },
      plugins: { legend: { display: false } }
    };
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
      message, duration: 2500, color, position: 'bottom',
    });
    await toast.present();
  }
}