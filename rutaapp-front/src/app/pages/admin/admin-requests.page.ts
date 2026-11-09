import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { IonContent, IonSpinner } from '@ionic/angular';
import { AdminService } from '../../services/admin';
import { PagerComponent } from '../../components/pager/pager.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';

@Component({
  selector: 'app-admin-requests',
  standalone: true,
  imports: [DatePipe, DecimalPipe, IonContent, IonSpinner, PagerComponent, StatusBadgeComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Solicitudes de transporte</h1>

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
            <p class="muted">No hay solicitudes en esta lista.</p>
          } @else {
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr><th>N.º</th><th>Fecha</th><th>Cliente</th><th>Origen → Destino</th><th>Distancia est.</th><th>Tarifa est.</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  @for (r of rows(); track r.id) {
                    <tr>
                      <td>#{{ r.id }}</td>
                      <td>{{ r.created_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                      <td>{{ r.client?.name }}</td>
                      <td>{{ r.origin_name }} → {{ r.destination_name }}</td>
                      <td>{{ r.estimated_distance_km }} km</td>
                      <td>$ {{ r.estimated_fare | number }}</td>
                      <td><app-status-badge [status]="r.status" /></td>
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
export class AdminRequestsPage implements OnInit {
  private admin = inject(AdminService);

  filters = [
    { value: '', label: 'Todas' },
    { value: 'requested', label: 'Solicitadas' },
    { value: 'assigned', label: 'Asignadas' },
    { value: 'completed', label: 'Completadas' },
    { value: 'cancelled', label: 'Canceladas' },
  ];

  rows = signal<any[]>([]);
  filter = signal('');
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  loading = signal(true);
  error = signal('');

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

  // GET /admin/requests
  private load() {
    this.loading.set(true);
    this.admin.requests(this.filter(), this.page()).subscribe({
      next: (res) => {
        this.rows.set(res.requests.data);
        this.page.set(res.requests.current_page);
        this.lastPage.set(res.requests.last_page);
        this.total.set(res.requests.total);
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar las solicitudes.');
      },
    });
  }
}
