import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';
import { AdminService } from '../../services/admin';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';

interface Kpi {
  label: string;
  value: number;
  money?: boolean;
  link?: string;
  warn?: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, IonContent, IonSpinner, StatusBadgeComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Dashboard</h1>

        @if (loading()) {
          <div class="panel center"><ion-spinner name="dots"></ion-spinner></div>
        } @else if (error()) {
          <div class="panel"><p class="msg err">{{ error() }}</p></div>
        } @else {
          <div class="kpis">
            @for (k of kpis(); track k.label) {
              <div class="kpi" [class.link]="!!k.link" [class.warn]="k.warn" (click)="open(k.link)">
                <span class="n">{{ k.money ? '$ ' + (k.value | number) : k.value }}</span>
                <span class="l">{{ k.label }}</span>
              </div>
            }
          </div>

          <div class="panel">
            <h2>Últimos viajes</h2>
            @if (trips().length === 0) {
              <p class="muted">Todavía no hay viajes.</p>
            } @else {
              <div class="table-wrap">
                <table class="tbl">
                  <thead>
                    <tr><th>N.º</th><th>Fecha</th><th>Cliente</th><th>Conductor</th><th>Estado</th><th>Valor</th></tr>
                  </thead>
                  <tbody>
                    @for (t of trips(); track t.id) {
                      <tr>
                        <td>#{{ t.id }}</td>
                        <td>{{ t.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                        <td>{{ t.client?.name }}</td>
                        <td>{{ t.driver?.user?.name ?? '—' }}</td>
                        <td><app-status-badge [status]="t.status" /></td>
                        <td>{{ t.final_fare != null ? '$ ' + (t.final_fare | number) : '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <div class="panel">
            <h2>Últimas incidencias</h2>
            @for (i of incidents(); track i.id) {
              <div class="incident">
                <div class="row between">
                  <strong>Viaje #{{ i.trip_id }} · {{ i.client?.name }}</strong>
                  <small class="muted">{{ i.created_at | date: 'dd/MM/yyyy HH:mm' }}</small>
                </div>
                <p class="muted">{{ i.description }}</p>
              </div>
            } @empty {
              <p class="muted">No hay incidencias reportadas.</p>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .center { text-align: center; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
    .kpi {
      display: flex; flex-direction: column; gap: 4px; padding: 18px;
      border-radius: 22px; background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.16);
    }
    .kpi.link { cursor: pointer; }
    .kpi.warn { border-color: rgba(251, 191, 36, 0.7); }
    .n { font-size: 26px; font-weight: 800; color: #60a5fa; }
    .l { font-size: 13px; opacity: 0.7; }
    .incident { padding: 12px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); }
    .incident p { margin: 4px 0 0; }
    @media (max-width: 800px) { .kpis { grid-template-columns: 1fr 1fr; } }
  `],
})
export class AdminDashboardPage implements OnInit, OnDestroy {
  private admin = inject(AdminService);
  private router = inject(Router);

  stats = signal<any>(null);
  trips = signal<any[]>([]);
  incidents = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  private timer: any;

  kpis = computed<Kpi[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { label: 'Total de clientes', value: s.total_clients },
      { label: 'Total de conductores', value: s.total_drivers },
      { label: 'Conductores pendientes de aprobación', value: s.pending_drivers, link: '/admin/drivers', warn: s.pending_drivers > 0 },
      { label: 'Conductores aprobados', value: s.approved_drivers },
      { label: 'Viajes activos', value: s.active_trips },
      { label: 'Viajes completados', value: s.completed_trips },
      { label: 'Viajes cancelados', value: s.cancelled_trips },
      { label: 'Solicitudes pendientes', value: s.pending_requests, link: '/admin/requests' },
      { label: 'Ingresos totales', value: s.total_revenue, money: true },
    ];
  });

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.load(), 8000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  // GET /admin/dashboard
  private load() {
    this.admin.dashboard().subscribe({
      next: (res) => {
        this.stats.set(res.stats);
        this.trips.set(res.recent_trips ?? []);
        this.incidents.set(res.recent_incidents ?? []);
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar el dashboard.');
      },
    });
  }

  open(link?: string) {
    if (link) this.router.navigateByUrl(link);
  }
}
