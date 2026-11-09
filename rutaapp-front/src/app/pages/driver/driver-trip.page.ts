import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonInput, IonSpinner } from '@ionic/angular';
import { DriverService } from '../../services/driver';
import { MapPoint } from '../../services/geocode';
import { haversineKm } from '../../utils/geo';
import { MapPickerComponent } from '../../components/map-picker/map-picker.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';

const samePoint = (a: MapPoint | null, b: MapPoint | null) => a?.lat === b?.lat && a?.lng === b?.lng;

const HELP: Record<string, string> = {
  assigned: 'Ve al punto de recogida y pulsa "Llegué al origen" cuando estés allí.',
  driver_arrived: 'Espera al pasajero y pulsa "Iniciar viaje" cuando suba.',
  in_progress: 'Lleva al pasajero al destino y finaliza el viaje al llegar.',
};

@Component({
  selector: 'app-driver-trip',
  standalone: true,
  imports: [DecimalPipe, IonContent, IonButton, IonInput, IonSpinner, MapPickerComponent, StatusBadgeComponent],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Viaje actual</h1>

        @if (loading()) {
          <div class="panel center"><ion-spinner name="dots"></ion-spinner></div>
        } @else if (done(); as d) {
          <div class="panel">
            <h2>✅ Viaje finalizado</h2>
            <p class="muted">El servicio quedó registrado en tu historial.</p>
            <p class="muted">Tarifa definitiva</p>
            <h3 class="price">$ {{ d.final_fare | number }}</h3>
            <div class="chips">
              <span class="chip">📍 {{ d.distance_travelled_km }} km</span>
              <span class="chip">⏱ {{ d.duration_travelled_min }} min</span>
            </div>
            <ion-button (click)="go('/driver/requests')">Ver más solicitudes</ion-button>
            <ion-button fill="outline" (click)="go('/driver/services')">Mis servicios</ion-button>
          </div>
        } @else if (!trip()) {
          <div class="panel">
            <h2>No tienes un viaje activo</h2>
            <p class="muted">{{ message() || 'Acepta una solicitud para empezar un viaje.' }}</p>
            <ion-button (click)="go('/driver/requests')">Ver solicitudes</ion-button>
          </div>
        } @else if (trip(); as t) {
          <div class="two-col">
            <div>
              <div class="panel">
                <div class="row between">
                  <h2>Servicio #{{ t.id }}</h2>
                  <app-status-badge [status]="t.status" />
                </div>
                <p class="muted">{{ help() }}</p>
                <div class="row"><span class="dot"></span>{{ t.origin_name }}</div>
                <div class="row"><span class="dot d"></span>{{ t.destination_name }}</div>
                <p class="muted">Tarifa estimada</p>
                <h3 class="price">$ {{ t.estimated_fare | number }}</h3>
              </div>

              <div class="panel">
                <h2>Pasajero</h2>
                <p class="strong">{{ t.client?.name }}</p>
                <p class="muted">📞 {{ t.client?.phone }}</p>
              </div>

              <div class="panel">
                @switch (t.status) {
                  @case ('assigned') {
                    <ion-button expand="block" [disabled]="busy()" (click)="arrive()">Llegué al origen</ion-button>
                  }
                  @case ('driver_arrived') {
                    <ion-button expand="block" [disabled]="busy()" (click)="startTrip()">Iniciar viaje</ion-button>
                  }
                  @case ('in_progress') {
                    <h2>Finalizar viaje</h2>
                    <p class="muted">Confirma la distancia y la duración reales del recorrido.</p>
                    <ion-input label="Distancia recorrida (km)" labelPlacement="floating" fill="outline"
                      type="number" [value]="km()" (ionInput)="km.set($any($event).detail.value)"></ion-input>
                    <ion-input class="ion-margin-top" label="Duración (minutos)" labelPlacement="floating"
                      fill="outline" type="number" [value]="min()"
                      (ionInput)="min.set($any($event).detail.value)"></ion-input>
                    <ion-button class="ion-margin-top" expand="block" [disabled]="busy()" (click)="finish()">
                      Finalizar viaje
                    </ion-button>
                  }
                }
                @if (message()) { <p class="msg err">{{ message() }}</p> }

                <label class="sim">
                  <input type="checkbox" [checked]="driver.simulating()" (change)="toggleSim()" />
                  Simular mi recorrido (modo demo)
                </label>
              </div>
            </div>

            <div class="panel map-panel">
              <app-map-picker [origin]="origin()" [destination]="destination()"
                [driver]="simPoint()" [centerOnMe]="false"></app-map-picker>
            </div>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .center { text-align: center; }
    .sim { display: flex; align-items: center; gap: 8px; margin-top: 16px; font-size: 13px; opacity: 0.8; cursor: pointer; }
  `],
})
export class DriverTripPage implements OnInit, OnDestroy {
  driver = inject(DriverService);
  private router = inject(Router);

  trip = signal<any>(null);
  done = signal<any>(null);
  loading = signal(true);
  busy = signal(false);
  message = signal('');
  km = signal('');
  min = signal('');
  simPoint = signal<MapPoint | null>(null);

  private timer: any;
  private simTimer: any;
  private hadTrip = false;
  private prefilled = false;

  help = computed(() => HELP[this.trip()?.status] ?? '');

  origin = computed<MapPoint | null>(
    () => {
      const t = this.trip();
      return t ? { name: t.origin_name, lat: t.origin_latitude, lng: t.origin_longitude } : null;
    },
    { equal: samePoint }
  );

  destination = computed<MapPoint | null>(
    () => {
      const t = this.trip();
      return t ? { name: t.destination_name, lat: t.destination_latitude, lng: t.destination_longitude } : null;
    },
    { equal: samePoint }
  );

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.load(), 5000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
    this.stopSim();
  }

  // GET /driver/active
  private load() {
    this.driver.getActive().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.has_active) {
          this.hadTrip = true;
          this.trip.set(res.trip);
          this.driver.setActiveTrip(res.trip.id);
          this.prefill(res.trip);
        } else {
          this.trip.set(null);
          this.driver.setActiveTrip(null);
          this.stopSim();
          if (this.hadTrip && !this.done()) {
            this.message.set('El viaje ya no está activo (el pasajero pudo cancelarlo).');
          }
        }
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 403) this.message.set(err.error?.message || 'Tu cuenta aún no está aprobada.');
      },
    });
  }

  // Sugiere la distancia y la duración al empezar el recorrido (se pueden editar)
  private prefill(t: any) {
    if (t.status !== 'in_progress' || this.prefilled) return;
    this.prefilled = true;
    const km = haversineKm(t.origin_latitude, t.origin_longitude, t.destination_latitude, t.destination_longitude);
    this.km.set(String(Math.max(0.1, Math.round(km * 100) / 100)));
    const elapsed = t.started_at ? Math.ceil((Date.now() - new Date(t.started_at).getTime()) / 60000) : 1;
    this.min.set(String(Math.max(1, elapsed)));
  }

  private fail(err: any, fallback: string) {
    this.busy.set(false);
    this.message.set(err.error?.message || fallback);
    this.load();
  }

  // POST /driver/trips/{id}/arrive
  arrive() {
    const t = this.trip();
    if (!t) return;
    this.busy.set(true);
    this.message.set('');
    this.driver.arrive(t.id).subscribe({
      next: () => { this.busy.set(false); this.load(); },
      error: (err) => this.fail(err, 'No se pudo registrar la llegada.'),
    });
  }

  // POST /driver/trips/{id}/start
  startTrip() {
    const t = this.trip();
    if (!t) return;
    this.busy.set(true);
    this.message.set('');
    this.driver.start(t.id).subscribe({
      next: () => { this.busy.set(false); this.load(); },
      error: (err) => this.fail(err, 'No se pudo iniciar el viaje.'),
    });
  }

  // POST /driver/trips/{id}/complete
  finish() {
    const t = this.trip();
    if (!t) return;
    const km = Number(this.km());
    const min = Number(this.min());
    if (!(km > 0) || !(min > 0)) {
      this.message.set('Escribe la distancia y la duración reales (mayores a 0).');
      return;
    }
    this.busy.set(true);
    this.message.set('');
    this.driver.complete(t.id, km, min).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.done.set(res.trip);
        this.trip.set(null);
        this.prefilled = false;
        this.stopSim();
        this.driver.setActiveTrip(null);
      },
      error: (err) => this.fail(err, 'No se pudo finalizar el viaje.'),
    });
  }

  // ---------- Modo demo: simula el recorrido para que el pasajero vea moverse el carro ----------
  toggleSim() {
    if (this.driver.simulating()) {
      this.stopSim();
    } else {
      this.driver.simulating.set(true);
      this.simStep();
      this.simTimer = setInterval(() => this.simStep(), 3000);
    }
  }

  private stopSim() {
    clearInterval(this.simTimer);
    this.driver.simulating.set(false);
    this.simPoint.set(null);
  }

  private simStep() {
    const t = this.trip();
    if (!t) return;
    // Rumbo: hacia el origen antes de iniciar, hacia el destino durante el viaje
    const target =
      t.status === 'in_progress'
        ? { lat: t.destination_latitude, lng: t.destination_longitude }
        : { lat: t.origin_latitude, lng: t.origin_longitude };

    const cur = this.simPoint() ?? { name: 'Tú', lat: t.origin_latitude + 0.01, lng: t.origin_longitude + 0.01 };
    const lat = cur.lat + (target.lat - cur.lat) * 0.2;
    const lng = cur.lng + (target.lng - cur.lng) * 0.2;

    this.simPoint.set({ name: 'Tú', lat, lng });
    this.driver.sendLocation(lat, lng, t.id).subscribe({ error: () => {} });
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }
}
