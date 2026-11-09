import { Component, OnInit, inject, signal } from '@angular/core';
import { IonContent, IonSpinner } from '@ionic/angular';
import { AdminService } from '../../services/admin';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';

@Component({
  selector: 'app-admin-vehicles',
  standalone: true,
  imports: [IonContent, IonSpinner, StatusBadgeComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Vehículos</h1>

        <div class="panel">
          @if (loading()) {
            <p class="center"><ion-spinner name="dots"></ion-spinner></p>
          } @else if (error()) {
            <p class="msg err">{{ error() }}</p>
          } @else if (vehicles().length === 0) {
            <p class="muted">No hay vehículos registrados.</p>
          } @else {
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr><th>Placa</th><th>Marca</th><th>Modelo</th><th>Año</th><th>Color</th><th>Capacidad</th><th>Conductor</th><th>Aprobación</th></tr>
                </thead>
                <tbody>
                  @for (v of vehicles(); track v.id) {
                    <tr>
                      <td><strong>{{ v.plate }}</strong></td>
                      <td>{{ v.brand }}</td>
                      <td>{{ v.model }}</td>
                      <td>{{ v.year }}</td>
                      <td>{{ v.color || '—' }}</td>
                      <td>{{ v.capacity }}</td>
                      <td>{{ v.driver?.name ?? '—' }}</td>
                      <td>@if (v.driver) { <app-status-badge [status]="v.driver.approval_status" /> }</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [`.center { text-align: center; }`],
})
export class AdminVehiclesPage implements OnInit {
  private admin = inject(AdminService);

  vehicles = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  // GET /admin/vehicles
  ngOnInit() {
    this.admin.vehicles().subscribe({
      next: (res) => {
        this.vehicles.set(res.vehicles);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar la lista de vehículos.');
      },
    });
  }
}
