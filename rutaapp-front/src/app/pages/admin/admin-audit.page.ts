import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular';
import { AdminService } from '../../services/admin';
import { PagerComponent } from '../../components/pager/pager.component';

const ACTIONS: Record<string, string> = {
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  register: 'Registro de usuario',
  password_reset: 'Recuperación de contraseña',
  ride_request: 'Solicitud de viaje',
  accept: 'Servicio aceptado',
  complete: 'Viaje finalizado',
  cancel: 'Cancelación',
  driver_approval: 'Estado de conductor',
  fare_create: 'Tarifa creada',
};

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [DatePipe, IonContent, IonButton, IonSpinner, PagerComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <div class="row between">
          <h1 class="page-title">Historial de auditoría</h1>
          <ion-button fill="outline" size="small" (click)="load()">Actualizar</ion-button>
        </div>

        <div class="panel">
          @if (loading()) {
            <p class="center"><ion-spinner name="dots"></ion-spinner></p>
          } @else if (error()) {
            <p class="msg err">{{ error() }}</p>
          } @else if (logs().length === 0) {
            <p class="muted">Todavía no hay acciones registradas.</p>
          } @else {
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr>
                </thead>
                <tbody>
                  @for (l of logs(); track l.id) {
                    <tr>
                      <td>{{ l.created_at | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                      <td>{{ l.user_name }}</td>
                      <td>{{ action(l.action) }}</td>
                      <td>{{ l.entity }}{{ l.entity_id != null ? ' #' + l.entity_id : '' }}</td>
                      <td>{{ l.detail || '—' }}</td>
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
export class AdminAuditPage implements OnInit {
  private admin = inject(AdminService);

  logs = signal<any[]>([]);
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  loading = signal(true);
  error = signal('');

  ngOnInit() {
    this.load();
  }

  action(a: string) {
    return ACTIONS[a] ?? a;
  }

  goPage(p: number) {
    this.page.set(p);
    this.load();
  }

  // GET /admin/audit-logs
  load() {
    this.loading.set(true);
    this.admin.auditLogs(this.page()).subscribe({
      next: (res) => {
        this.logs.set(res.logs.data);
        this.page.set(res.logs.current_page);
        this.lastPage.set(res.logs.last_page);
        this.total.set(res.logs.total);
        this.error.set('');
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'No se pudo cargar el historial.');
      },
    });
  }
}
