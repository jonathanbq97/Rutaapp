import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [DecimalPipe, IonContent, IonButton, IonSpinner],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <div class="row between">
          <h1 class="page-title">Reportes</h1>
          <ion-button fill="outline" size="small" (click)="load()">Actualizar</ion-button>
        </div>

        @if (loading()) {
          <div class="panel center"><ion-spinner name="dots"></ion-spinner></div>
        } @else if (error()) {
          <div class="panel"><p class="msg err">{{ error() }}</p></div>
        } @else if (report(); as r) {
          <div class="stats">
            <div class="stat"><span class="n">$ {{ r.total_revenue | number }}</span><span class="l">Ingresos totales</span></div>
            <div class="stat"><span class="n">{{ r.completed_trips }}</span><span class="l">Viajes completados</span></div>
            <div class="stat"><span class="n">{{ r.cancelled_trips }}</span><span class="l">Viajes cancelados</span></div>
            <div class="stat"><span class="n">{{ r.cancellation_rate }} %</span><span class="l">Tasa de cancelación</span></div>
          </div>

          <div class="panel">
            <h2>Ingresos por día</h2>
            @for (d of r.revenue_by_day; track d.date) {
              <div class="bar-row">
                <span class="bar-date">{{ d.date }}</span>
                <div class="bar-track"><div class="bar" [style.width.%]="percent(d.revenue)"></div></div>
                <span class="bar-val">$ {{ d.revenue | number }}</span>
              </div>
            } @empty {
              <p class="muted">Todavía no hay ingresos registrados.</p>
            }
          </div>

          <div class="panel">
            <h2>Desempeño de conductores</h2>
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr><th>Conductor</th><th>Servicios completados</th><th>Cancelados</th><th>Ingresos</th><th>Calificación</th></tr>
                </thead>
                <tbody>
                  @for (d of r.drivers_performance; track d.driver_id) {
                    <tr>
                      <td><strong>{{ d.name }}</strong></td>
                      <td>{{ d.services_completed }}</td>
                      <td>{{ d.services_cancelled }}</td>
                      <td>$ {{ d.revenue | number }}</td>
                      <td>⭐ {{ d.rating_average }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .center { text-align: center; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
    .stat {
      display: flex; flex-direction: column; gap: 4px; padding: 18px;
      border-radius: 22px; background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.16);
    }
    .n { font-size: 24px; font-weight: 800; color: #60a5fa; }
    .l { font-size: 13px; opacity: 0.7; }
    .bar-row { display: grid; grid-template-columns: 100px 1fr 120px; align-items: center; gap: 12px; margin: 10px 0; font-size: 14px; }
    .bar-track { height: 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
    .bar { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .bar-val { text-align: right; font-weight: 600; }
    @media (max-width: 800px) {
      .stats { grid-template-columns: 1fr 1fr; }
      .bar-row { grid-template-columns: 90px 1fr; }
      .bar-val { grid-column: 1 / -1; text-align: left; }
    }
  `],
})
export class AdminReportsPage implements OnInit {
  private admin = inject(AdminService);

  report = signal<any>(null);
  loading = signal(true);
  error = signal('');

  private max = computed(() => {
    const days: any[] = this.report()?.revenue_by_day ?? [];
    return Math.max(1, ...days.map((d) => d.revenue));
  });

  ngOnInit() {
    this.load();
  }

  percent(value: number) {
    return Math.round((value / this.max()) * 100);
  }

  // GET /admin/reports
  load() {
    this.loading.set(true);
    this.admin.reports().subscribe({
      next: (res) => {
        this.report.set(res.report);
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar el reporte.');
      },
    });
  }
}
