import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular';
import { AuthService } from '../../services/auth';
import { RideService } from '../../services/ride';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, IonContent, IonButton, StatusBadgeComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Hola, {{ auth.user()?.name }}</h1>
        <p class="lead">¿A dónde vamos hoy?</p>

        @if (active(); as a) {
          <div class="panel">
            <div class="row between">
              <h2>Tienes un viaje en curso</h2>
              <app-status-badge [status]="a.status" />
            </div>
            <div class="row"><span class="dot"></span>{{ a.origin_name }}</div>
            <div class="row"><span class="dot d"></span>{{ a.destination_name }}</div>
            <ion-button (click)="go('/trip')">Ver mi viaje</ion-button>
          </div>
        }

        <div class="quick">
          <button type="button" class="qa" (click)="go('/request')">
            <span class="ico">🚗</span><strong>Solicitar viaje</strong><small>Elige origen y destino</small>
          </button>
          <button type="button" class="qa" (click)="go('/trip')">
            <span class="ico">📍</span><strong>Mi viaje</strong><small>Sigue tu conductor</small>
          </button>
          <button type="button" class="qa" (click)="go('/trips')">
            <span class="ico">🧾</span><strong>Mis viajes</strong><small>Historial y calificaciones</small>
          </button>
          <button type="button" class="qa" (click)="go('/profile')">
            <span class="ico">👤</span><strong>Mi perfil</strong><small>Tus datos</small>
          </button>
        </div>

        <div class="panel">
          <div class="row between">
            <h2>Tus últimos viajes</h2>
            <ion-button fill="clear" size="small" (click)="go('/trips')">Ver todos</ion-button>
          </div>
          @for (t of recent(); track t.id) {
            <div class="trip-row">
              <div>
                <strong>{{ t.origin_name }} → {{ t.destination_name }}</strong>
                <p class="muted">{{ t.created_at | date: 'dd/MM/yyyy HH:mm' }}
                  @if (t.final_fare != null) { · $ {{ t.final_fare | number }} }
                </p>
              </div>
              <app-status-badge [status]="t.status" />
            </div>
          } @empty {
            <p class="muted">Todavía no has hecho viajes. ¡Pide el primero!</p>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .lead { margin: -8px 0 18px; opacity: 0.7; }
    .quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
    .qa {
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 20px;
      font: inherit; color: inherit; text-align: left; cursor: pointer; border-radius: 22px;
      background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.16);
    }
    .qa:hover { background: rgba(47, 107, 255, 0.2); border-color: rgba(96, 165, 250, 0.6); }
    .ico { font-size: 28px; }
    .qa small { opacity: 0.65; }
    .trip-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); }
    .trip-row p { margin: 2px 0 0; font-size: 13px; }
    @media (max-width: 800px) { .quick { grid-template-columns: 1fr 1fr; } }
  `],
})
export class ClientDashboardPage implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private rides = inject(RideService);
  private router = inject(Router);

  active = signal<any>(null);
  recent = signal<any[]>([]);

  private timer: any;

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.load(), 8000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private load() {
    // GET /client/active
    this.rides.getActive().subscribe({
      next: (res) => this.active.set(res.has_active ? res.data : null),
      error: () => {},
    });
    // GET /client/trips
    this.rides.getTrips('', 1).subscribe({
      next: (res) => this.recent.set((res.trips?.data ?? []).slice(0, 3)),
      error: () => {},
    });
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }
}
