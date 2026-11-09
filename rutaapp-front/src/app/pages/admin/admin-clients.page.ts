import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IonContent, IonSpinner } from '@ionic/angular';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-admin-clients',
  standalone: true,
  imports: [DecimalPipe, IonContent, IonSpinner],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Clientes</h1>

        <div class="panel">
          <div class="filters">
            <input class="ctl" type="search" placeholder="Buscar por nombre, correo o teléfono"
              (input)="search.set($any($event.target).value)" />
          </div>

          @if (loading()) {
            <p class="center"><ion-spinner name="dots"></ion-spinner></p>
          } @else if (error()) {
            <p class="msg err">{{ error() }}</p>
          } @else if (shown().length === 0) {
            <p class="muted">No hay clientes que coincidan.</p>
          } @else {
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr><th>N.º</th><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Viajes</th><th>Total gastado</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  @for (c of shown(); track c.id) {
                    <tr>
                      <td>#{{ c.id }}</td>
                      <td>{{ c.name }}</td>
                      <td>{{ c.email }}</td>
                      <td>{{ c.phone }}</td>
                      <td>{{ c.trips_count }}</td>
                      <td>$ {{ c.total_spent | number }}</td>
                      <td>{{ c.status === 'active' ? 'Activo' : c.status }}</td>
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
export class AdminClientsPage implements OnInit {
  private admin = inject(AdminService);

  clients = signal<any[]>([]);
  search = signal('');
  loading = signal(true);
  error = signal('');

  shown = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.clients();
    return this.clients().filter((c) =>
      [c.name, c.email, c.phone].some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  });

  // GET /admin/clients
  ngOnInit() {
    this.admin.clients().subscribe({
      next: (res) => {
        this.clients.set(res.clients);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar la lista de clientes.');
      },
    });
  }
}
