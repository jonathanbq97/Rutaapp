import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { IonContent, IonSpinner } from '@ionic/angular';
import { RideService } from '../../services/ride';
import { PagerComponent } from '../../components/pager/pager.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { RatingFormComponent } from '../../components/rating-form/rating-form.component';

@Component({
  selector: 'app-client-trips',
  standalone: true,
  imports: [DatePipe, DecimalPipe, IonContent, IonSpinner, PagerComponent, StatusBadgeComponent, RatingFormComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Mis viajes</h1>

        @if (ratingFor(); as t) {
          <div class="panel">
            <div class="row between">
              <h2>Calificar el viaje #{{ t.id }}</h2>
              <button type="button" class="chip-btn" (click)="ratingFor.set(null)">Cerrar</button>
            </div>
            <p class="muted">{{ t.origin_name }} → {{ t.destination_name }} · {{ t.driver?.user?.name }}</p>
            @for (x of [t]; track x.id) {
              <app-rating-form [tripId]="x.id" (rated)="onRated()" />
            }
          </div>
        }

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
          } @else if (rows().length === 0) {
            <p class="muted">No tienes viajes en esta lista.</p>
          } @else {
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>N.º</th><th>Fecha y hora</th><th>Origen</th><th>Destino</th><th>Conductor</th>
                    <th>Vehículo</th><th>Distancia</th><th>Valor pagado</th><th>Estado</th><th>Calificación</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of rows(); track t.id) {
                    <tr>
                      <td>#{{ t.id }}</td>
                      <td>{{ t.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                      <td>{{ t.origin_name }}</td>
                      <td>{{ t.destination_name }}</td>
                      <td>{{ t.driver?.user?.name ?? '—' }}</td>
                      <td>{{ t.vehicle ? t.vehicle.brand + ' ' + t.vehicle.model + ' · ' + t.vehicle.plate : '—' }}</td>
                      <td>{{ t.distance_travelled_km != null ? t.distance_travelled_km + ' km' : '—' }}</td>
                      <td>{{ t.final_fare != null ? '$ ' + (t.final_fare | number) : '—' }}</td>
                      <td><app-status-badge [status]="t.status" /></td>
                      <td>
                        @if (t.rating) {
                          ★ {{ t.rating.score }}
                        } @else if (t.status === 'completed') {
                          <button type="button" class="chip-btn on" (click)="ratingFor.set(t)">Calificar</button>
                        } @else { — }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pager [page]="page()" [lastPage]="lastPage()" [total]="total()" (changed)="goPage($event)" />
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [`.center { text-align: center; }`],
})
export class ClientTripsPage implements OnInit {
  private rides = inject(RideService);

  filters = [
    { value: '', label: 'Todos' },
    { value: 'completed', label: 'Completados' },
    { value: 'cancelled', label: 'Cancelados' },
    { value: 'in_progress', label: 'En curso' },
  ];

  rows = signal<any[]>([]);
  filter = signal('');
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  loading = signal(true);
  error = signal('');
  ratingFor = signal<any>(null);

  ngOnInit() {
    this.load();
  }

  setFilter(v: string) {
    this.filter.set(v);
    this.page.set(1);
    this.load();
  }

  goPage(p: number) {
    this.page.set(p);
    this.load();
  }

  // Después de calificar se recarga la lista para mostrar las estrellas
  onRated() {
    this.load();
  }

  // GET /client/trips
  private load() {
    this.loading.set(true);
    this.rides.getTrips(this.filter(), this.page()).subscribe({
      next: (res) => {
        this.rows.set(res.trips.data);
        this.page.set(res.trips.current_page);
        this.lastPage.set(res.trips.last_page);
        this.total.set(res.trips.total);
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar tu historial.');
      },
    });
  }
}
