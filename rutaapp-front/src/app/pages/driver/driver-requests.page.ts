import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular';
import { AuthService } from '../../services/auth';
import { DriverService } from '../../services/driver';

@Component({
  selector: 'app-driver-requests',
  standalone: true,
  imports: [DecimalPipe, IonContent, IonButton, IonSpinner],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Solicitudes disponibles</h1>

        @if (blocked()) {
          <div class="panel warn-panel">
            <h2>No puedes recibir servicios todavía</h2>
            <p class="muted">{{ blocked() }}</p>
          </div>
        } @else {
          @if (availability() === 'unavailable') {
            <div class="panel warn-panel">
              <div class="row between">
                <div>
                  <h2>Estás desconectado</h2>
                  <p class="muted">Conéctate para poder aceptar servicios.</p>
                </div>
                <ion-button [disabled]="connecting()" (click)="connect()">Conectarme</ion-button>
              </div>
            </div>
          } @else if (availability() === 'busy') {
            <div class="panel warn-panel">
              <div class="row between">
                <div>
                  <h2>Tienes un servicio en curso</h2>
                  <p class="muted">Termínalo para aceptar otro.</p>
                </div>
                <ion-button (click)="go('/driver/trip')">Ir al viaje</ion-button>
              </div>
            </div>
          }

          @if (message()) { <p class="msg err">{{ message() }}</p> }

          @if (loading()) {
            <div class="panel center"><ion-spinner name="dots"></ion-spinner></div>
          }

          @for (r of requests(); track r.id) {
            <div class="panel">
              <div class="row between">
                <strong>Solicitud #{{ r.id }}</strong>
                <span class="price">$ {{ r.estimated_fare | number }}</span>
              </div>
              <div class="row"><span class="dot"></span>{{ r.origin_name }}</div>
              <div class="row"><span class="dot d"></span>{{ r.destination_name }}</div>
              <div class="chips">
                <span class="chip">📍 {{ r.estimated_distance_km }} km</span>
                <span class="chip">⏱ {{ r.estimated_duration_min }} min</span>
                <span class="chip">👤 {{ r.client?.name }}</span>
              </div>
              <ion-button expand="block" [disabled]="acceptingId() === r.id || !canAccept()"
                (click)="accept(r)">
                @if (acceptingId() === r.id) { <ion-spinner name="dots"></ion-spinner> } @else { Aceptar servicio }
              </ion-button>
            </div>
          } @empty {
            @if (!loading()) {
              <div class="panel">
                <h2>No hay solicitudes por ahora</h2>
                <p class="muted">Cuando un pasajero pida un viaje, aparecerá aquí.</p>
              </div>
            }
          }
        }
      </div>
    </ion-content>
  `,
  styles: [`.center { text-align: center; }`],
})
export class DriverRequestsPage implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private driver = inject(DriverService);
  private router = inject(Router);

  requests = signal<any[]>([]);
  loading = signal(true);
  acceptingId = signal<number | null>(null);
  connecting = signal(false);
  message = signal('');
  blocked = signal('');
  availability = signal('');

  canAccept = computed(() => this.availability() === 'available');

  private timer: any;

  ngOnInit() {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 5000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  refresh() {
    this.auth.me().subscribe({
      next: (r) => this.availability.set(r.user?.driver?.availability_status ?? ''),
      error: () => {},
    });
    // GET /driver/ride-requests
    this.driver.getRequests().subscribe({
      next: (r) => {
        this.requests.set(r.requests);
        this.blocked.set('');
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 403) {
          this.blocked.set(err.error?.message || 'Tu cuenta aún no está aprobada.');
        }
      },
    });
  }

  connect() {
    this.connecting.set(true);
    this.message.set('');
    this.driver.setAvailability('available').subscribe({
      next: () => {
        this.connecting.set(false);
        this.availability.set('available');
      },
      error: (err) => {
        this.connecting.set(false);
        this.message.set(err.error?.message || 'No se pudo conectar.');
      },
    });
  }

  // POST /driver/ride-requests/{id}/accept
  accept(r: any) {
    this.acceptingId.set(r.id);
    this.message.set('');
    this.driver.accept(r.id).subscribe({
      next: () => {
        this.acceptingId.set(null);
        this.router.navigateByUrl('/driver/trip');
      },
      error: (err) => {
        this.acceptingId.set(null);
        // 409: otro conductor tomó el servicio o fue cancelado
        this.message.set(err.error?.message || 'No se pudo aceptar el servicio.');
        this.refresh();
      },
    });
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }
}
