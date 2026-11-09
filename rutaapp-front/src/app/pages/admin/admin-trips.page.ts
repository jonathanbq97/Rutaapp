import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { IonContent, IonSpinner } from '@ionic/angular';
import { AdminService } from '../../services/admin';
import { PagerComponent } from '../../components/pager/pager.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';

@Component({
  selector: 'app-admin-trips',
  standalone: true,
  imports: [DatePipe, DecimalPipe, IonContent, IonSpinner, PagerComponent, StatusBadgeComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Historial de viajes</h1>

        <div class="panel">
          <div class="filters">
            <select class="ctl" (change)="setFilter('status', $any($event.target).value)">
              <option value="">Todos los estados</option>
              @for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
            </select>
            <select class="ctl" (change)="setFilter('client_id', $any($event.target).value)">
              <option value="">Todos los clientes</option>
              @for (c of clients(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
            <select class="ctl" (change)="setFilter('driver_id', $any($event.target).value)">
              <option value="">Todos los conductores</option>
              @for (d of driversList(); track d.id) { <option [value]="d.id">{{ d.user?.name }}</option> }
            </select>
            <input class="ctl" type="date" (change)="setFilter('date', $any($event.target).value)" />
          </div>

          @if (loading()) {
            <p class="center"><ion-spinner name="dots"></ion-spinner></p>
          } @else if (error()) {
            <p class="msg err">{{ error() }}</p>
          } @else if (rows().length === 0) {
            <p class="muted">No hay viajes con esos filtros.</p>
          } @else {
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>ID</th><th>Cliente</th><th>Conductor</th><th>Origen</th><th>Destino</th>
                    <th>Fecha</th><th>Distancia</th><th>Valor</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of rows(); track t.id) {
                    <tr>
                      <td>#{{ t.id }}</td>
                      <td>{{ t.client?.name }}</td>
                      <td>{{ t.driver?.user?.name ?? '—' }}</td>
                      <td>{{ t.origin_name }}</td>
                      <td>{{ t.destination_name }}</td>
                      <td>{{ t.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                      <td>{{ t.distance_travelled_km != null ? t.distance_travelled_km + ' km' : '—' }}</td>
                      <td>{{ t.final_fare != null ? '$ ' + (t.final_fare | number) : '—' }}</td>
                      <td><app-status-badge [status]="t.status" /></td>
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
export class AdminTripsPage implements OnInit {
  private admin = inject(AdminService);

  statuses = [
    { value: 'completed', label: 'Completados' },
    { value: 'cancelled', label: 'Cancelados' },
    { value: 'assigned', label: 'Asignados' },
    { value: 'driver_arrived', label: 'Conductor llegó' },
    { value: 'in_progress', label: 'En curso' },
  ];

  rows = signal<any[]>([]);
  clients = signal<any[]>([]);
  driversList = signal<any[]>([]);
  filters = signal<Record<string, string>>({ status: '', client_id: '', driver_id: '', date: '' });
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  loading = signal(true);
  error = signal('');

  ngOnInit() {
    // Listas para los filtros de cliente y conductor
    this.admin.clients().subscribe({ next: (r) => this.clients.set(r.clients), error: () => {} });
    this.admin.drivers().subscribe({ next: (r) => this.driversList.set(r.drivers), error: () => {} });
    this.load();
  }

  setFilter(key: string, value: string) {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.page.set(1);
    this.load();
  }

  goPage(p: number) {
    this.page.set(p);
    this.load();
  }

  // GET /admin/trips
  private load() {
    this.loading.set(true);
    this.admin.trips(this.filters(), this.page()).subscribe({
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
        this.error.set(err.error?.message || 'No se pudo cargar los viajes.');
      },
    });
  }
}
