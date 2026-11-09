import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular';
import { AuthService } from '../../services/auth';
import { DriverService } from '../../services/driver';
import { StatsRowComponent } from '../../components/stats-row/stats-row.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';

const APPROVAL: Record<string, string> = {
  pending: 'pendiente de aprobación',
  rejected: 'rechazada',
  suspended: 'suspendida',
};

@Component({
  selector: 'app-driver-home',
  standalone: true,
  imports: [IonContent, IonButton, IonSpinner, StatsRowComponent, StatusBadgeComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Hola, {{ me()?.name }}</h1>

        @if (loading()) {
          <div class="panel center"><ion-spinner name="dots"></ion-spinner></div>
        } @else if (approval() !== 'approved') {
          <div class="panel warn-panel">
            <h2>Tu cuenta está {{ approvalLabel() }}</h2>
            <p class="muted">Un administrador debe aprobar tu cuenta antes de que puedas recibir servicios.</p>
          </div>
        } @else {
          <div class="panel">
            <div class="row between">
              <div>
                <h2>{{ stateLabel() }}</h2>
                <p class="muted">{{ stateHelp() }}</p>
              </div>
              @if (availability() !== 'busy') {
                <ion-button [disabled]="busy()" (click)="toggle()">
                  {{ availability() === 'available' ? 'Desconectarme' : 'Conectarme' }}
                </ion-button>
              }
            </div>
            @if (message()) { <p class="msg err">{{ message() }}</p> }
          </div>

          @if (active(); as a) {
            <div class="panel">
              <div class="row between">
                <h2>Tienes un viaje en curso</h2>
                <app-status-badge [status]="a.status" />
              </div>
              <div class="row"><span class="dot"></span>{{ a.origin_name }}</div>
              <div class="row"><span class="dot d"></span>{{ a.destination_name }}</div>
              <ion-button (click)="go('/driver/trip')">Ir al viaje actual</ion-button>
            </div>
          }

          <app-stats-row [summary]="summary()" />

          <ion-button fill="outline" (click)="go('/driver/requests')">Ver solicitudes disponibles</ion-button>
        }
      </div>
    </ion-content>
  `,
  styles: [`.center { text-align: center; }`],
})
export class DriverHomePage implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private driver = inject(DriverService);
  private router = inject(Router);

  me = signal<any>(null);
  summary = signal<any>(null);
  active = signal<any>(null);
  loading = signal(true);
  busy = signal(false);
  message = signal('');

  private timer: any;

  approval = computed(() => this.me()?.driver?.approval_status);
  availability = computed(() => this.me()?.driver?.availability_status);
  approvalLabel = computed(() => APPROVAL[this.approval()] ?? '');

  stateLabel = computed(() => {
    switch (this.availability()) {
      case 'available': return 'Estás conectado';
      case 'busy': return 'En servicio';
      default: return 'Estás desconectado';
    }
  });

  stateHelp = computed(() => {
    switch (this.availability()) {
      case 'available': return 'Recibirás las solicitudes de los pasajeros.';
      case 'busy': return 'Terminas este servicio y vuelves a quedar disponible.';
      default: return 'Conéctate para ver y aceptar solicitudes.';
    }
  });

  ngOnInit() {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 5000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private refresh() {
    this.auth.me().subscribe({
      next: (res) => {
        this.me.set(res.user);
        this.loading.set(false);
        if (res.user?.driver?.approval_status !== 'approved') return;

        this.driver.getSummary().subscribe({ next: (r) => this.summary.set(r.summary), error: () => {} });
        this.driver.getActive().subscribe({
          next: (r) => {
            const trip = r.has_active ? r.trip : null;
            this.active.set(trip);
            this.driver.setActiveTrip(trip ? trip.id : null); // envía el GPS mientras hay viaje
          },
          error: () => {},
        });
      },
      error: () => this.loading.set(false),
    });
  }

  // PUT /driver/availability
  toggle() {
    const next = this.availability() === 'available' ? 'unavailable' : 'available';
    this.busy.set(true);
    this.message.set('');
    this.driver.setAvailability(next).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.me.update((m) => ({
          ...m,
          driver: { ...m.driver, availability_status: res.availability_status },
        }));
      },
      error: (err) => {
        this.busy.set(false);
        this.message.set(err.error?.message || 'No se pudo cambiar tu disponibilidad.');
      },
    });
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }
}
