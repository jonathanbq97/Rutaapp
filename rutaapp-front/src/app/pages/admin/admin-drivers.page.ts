import { Component, OnInit, inject, signal } from '@angular/core';
import { IonContent, IonButton, IonInput, IonSpinner } from '@ionic/angular';
import { AdminService } from '../../services/admin';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';

const AVAILABILITY: Record<string, string> = {
  available: 'Conectado',
  unavailable: 'Desconectado',
  busy: 'En servicio',
};

const RESULT: Record<string, string> = {
  approved: 'aprobado',
  rejected: 'rechazado',
  suspended: 'suspendido',
};

@Component({
  selector: 'app-admin-drivers',
  standalone: true,
  imports: [IonContent, IonButton, IonInput, IonSpinner, StatusBadgeComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Conductores</h1>

        <div class="chips">
          @for (f of filters; track f.value) {
            <button type="button" class="chip-btn" [class.on]="filter() === f.value"
              (click)="setFilter(f.value)">{{ f.label }}</button>
          }
        </div>

        @if (message()) { <p class="msg" [class.err]="isError()">{{ message() }}</p> }

        @if (loading()) {
          <div class="panel center"><ion-spinner name="dots"></ion-spinner></div>
        }

        @for (d of drivers(); track d.id) {
          <div class="panel">
            <div class="row between">
              <div>
                <h2>{{ d.user?.name }}</h2>
                <p class="muted">{{ d.user?.email }} · {{ d.user?.phone }}</p>
              </div>
              <app-status-badge [status]="d.approval_status" />
            </div>

            <div class="chips">
              <span class="chip">Licencia {{ d.license_number }}</span>
              <span class="chip">⭐ {{ d.rating_average }}</span>
              <span class="chip">{{ availability(d.availability_status) }}</span>
            </div>

            @for (v of d.vehicles; track v.plate) {
              <p class="muted">
                🚗 {{ v.brand }} {{ v.model }} ({{ v.year }}) · {{ v.color || 'sin color' }} ·
                placa {{ v.plate }} · {{ v.capacity }} pasajeros
              </p>
            }
            @if (d.admin_notes) { <p class="muted">Nota: {{ d.admin_notes }}</p> }

            <ion-input label="Nota (opcional)" labelPlacement="floating" fill="outline"
              (ionInput)="setNote(d.id, $any($event).detail.value)"></ion-input>

            <div class="actions">
              @if (d.approval_status !== 'approved') {
                <ion-button [disabled]="busyId() === d.id" (click)="act(d, 'approved')">Aprobar</ion-button>
              }
              @if (d.approval_status === 'pending') {
                <ion-button fill="outline" color="danger" [disabled]="busyId() === d.id"
                  (click)="act(d, 'rejected')">Rechazar</ion-button>
              }
              @if (d.approval_status === 'approved') {
                <ion-button fill="outline" color="danger" [disabled]="busyId() === d.id"
                  (click)="act(d, 'suspended')">Suspender</ion-button>
              }
            </div>
          </div>
        } @empty {
          @if (!loading()) {
            <div class="panel"><p class="muted">No hay conductores en esta lista.</p></div>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .center { text-align: center; }
    .actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  `],
})
export class AdminDriversPage implements OnInit {
  private admin = inject(AdminService);

  filters = [
    { value: '', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'approved', label: 'Aprobados' },
    { value: 'suspended', label: 'Suspendidos' },
    { value: 'rejected', label: 'Rechazados' },
  ];

  drivers = signal<any[]>([]);
  filter = signal('');
  loading = signal(true);
  busyId = signal<number | null>(null);
  message = signal('');
  isError = signal(false);
  notes = signal<Record<number, string>>({});

  ngOnInit() {
    this.load();
  }

  availability(s: string) {
    return AVAILABILITY[s] ?? s;
  }

  setFilter(v: string) {
    this.filter.set(v);
    this.load();
  }

  setNote(id: number, value: string) {
    this.notes.update((n) => ({ ...n, [id]: value ?? '' }));
  }

  // GET /admin/drivers
  private load() {
    this.loading.set(true);
    this.admin.drivers(this.filter()).subscribe({
      next: (res) => {
        this.drivers.set(res.drivers);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.isError.set(true);
        this.message.set(err.error?.message || 'No se pudo cargar la lista.');
      },
    });
  }

  // PATCH /admin/drivers/{id}/approval
  act(d: any, status: string) {
    this.busyId.set(d.id);
    this.message.set('');
    this.admin.setApproval(d.id, status, (this.notes()[d.id] ?? '').trim()).subscribe({
      next: () => {
        this.busyId.set(null);
        this.isError.set(false);
        this.message.set(`${d.user?.name} fue ${RESULT[status]}.`);
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.isError.set(true);
        this.message.set(err.error?.message || 'No se pudo actualizar el conductor.');
      },
    });
  }
}
