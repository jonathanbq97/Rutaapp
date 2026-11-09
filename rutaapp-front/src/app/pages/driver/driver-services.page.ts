import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular';
import { DriverService } from '../../services/driver';
import { StatsRowComponent } from '../../components/stats-row/stats-row.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';

@Component({
  selector: 'app-driver-services',
  standalone: true,
  imports: [DatePipe, DecimalPipe, IonContent, IonButton, IonSpinner, StatsRowComponent, StatusBadgeComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Mis servicios</h1>

        <app-stats-row [summary]="summary()" />

        <div class="panel">
          <div class="chips">
            @for (f of filters; track f.value) {
              <button type="button" class="chip-btn" [class.on]="filter() === f.value"
                (click)="setFilter(f.value)">{{ f.label }}</button>
            }
          </div>

          @if (loading()) {
            <p class="center"><ion-spinner name="dots"></ion-spinner></p>
          } @else if (error()) {
            <p class="msg err">{{ error() }}</p>
          } @else if (trips().length === 0) {
            <p class="muted">Todavía no tienes servicios en esta lista.</p>
          } @else {
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>N.º</th><th>Fecha</th><th>Cliente</th><th>Origen → Destino</th>
                    <th>Distancia</th><th>Duración</th><th>Valor</th><th>Estado</th><th>Calificación</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of trips(); track t.id) {
                    <tr>
                      <td>#{{ t.id }}</td>
                      <td>{{ t.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                      <td>{{ t.client?.name }}</td>
                      <td>{{ t.origin_name }} → {{ t.destination_name }}</td>
                      <td>{{ t.distance_travelled_km != null ? t.distance_travelled_km + ' km' : '—' }}</td>
                      <td>{{ t.duration_travelled_min != null ? t.duration_travelled_min + ' min' : '—' }}</td>
                      <td>{{ t.final_fare != null ? '$ ' + (t.final_fare | number) : '—' }}</td>
                      <td><app-status-badge [status]="t.status" /></td>
                      <td>{{ t.rating ? '★ ' + t.rating.score : '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="pager">
              <ion-button fill="outline" size="small" [disabled]="page() <= 1" (click)="move(-1)">Anterior</ion-button>
              <span>Página {{ page() }} de {{ lastPage() }} · {{ total() }} servicios</span>
              <ion-button fill="outline" size="small" [disabled]="page() >= lastPage()" (click)="move(1)">Siguiente</ion-button>
            </div>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .center { text-align: center; }
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; font-size: 14px; flex-wrap: wrap; }
  `],
})
export class DriverServicesPage implements OnInit {
  private driver = inject(DriverService);

  filters = [
    { value: '', label: 'Todos' },
    { value: 'completed', label: 'Completados' },
    { value: 'cancelled', label: 'Cancelados' },
  ];

  trips = signal<any[]>([]);
  summary = signal<any>(null);
  filter = signal('');
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  loading = signal(true);
  error = signal('');

  ngOnInit() {
    this.driver.getSummary().subscribe({ next: (r) => this.summary.set(r.summary), error: () => {} });
    this.load();
  }

  setFilter(value: string) {
    this.filter.set(value);
    this.page.set(1);
    this.load();
  }

  move(delta: number) {
    this.page.update((p) => p + delta);
    this.load();
  }

  // GET /driver/trips
  private load() {
    this.loading.set(true);
    this.error.set('');
    this.driver.getTrips(this.filter(), this.page()).subscribe({
      next: (res) => {
        this.trips.set(res.trips.data);
        this.page.set(res.trips.current_page);
        this.lastPage.set(res.trips.last_page);
        this.total.set(res.trips.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar el historial.');
      },
    });
  }
}
