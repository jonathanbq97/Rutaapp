import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonText, IonSpinner, IonInput } from '@ionic/angular';
import { AuthService } from '../services/auth';
import { FareService } from '../services/fare';
import { RideService } from '../services/ride';
import { GeocodeService, MapPoint } from '../services/geocode';
import { MapPickerComponent } from '../components/map-picker/map-picker.component';

type Field = 'origin' | 'destination';
type Status = 'idle' | 'searching' | 'found' | 'approx' | 'notfound';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [DecimalPipe, MapPickerComponent, IonContent, IonButton, IonText, IonSpinner, IonInput],
})
export class HomePage {
  private auth = inject(AuthService);
  private fareService = inject(FareService);
  private rideService = inject(RideService);
  private geocode = inject(GeocodeService);
  private router = inject(Router);

  userName = JSON.parse(localStorage.getItem('user') || '{}').name || '';

  // Puntos elegidos (el nombre es lo que se envía a la API)
  origin = signal<MapPoint | null>(null);
  destination = signal<MapPoint | null>(null);

  // Texto de cada campo y estado de la búsqueda
  originText = signal('');
  destinationText = signal('');
  status = signal<Record<Field, Status>>({ origin: 'idle', destination: 'idle' });
  originFromGps = signal(false);

  loading = signal(false);
  requesting = signal(false);
  errorMessage = signal('');
  locationMessage = signal('');
  estimate = signal<any>(null);
  rideRequest = signal<any>(null);

  private lastMyLocation: MapPoint | null = null;
  private timers: Record<Field, any> = { origin: null, destination: null };
  private seq: Record<Field, number> = { origin: 0, destination: 0 };

  // ---------- Escribir una dirección ----------
  onType(field: Field, value: string) {
    const text = value ?? '';
    this.setText(field, text);
    if (field === 'origin') this.originFromGps.set(false);

    // Al escribir, el punto anterior deja de valer
    this.setPoint(field, null);
    this.estimate.set(null);
    this.rideRequest.set(null);
    this.errorMessage.set('');

    clearTimeout(this.timers[field]);
    if (text.trim().length < 3) {
      this.setStatus(field, 'idle');
      return;
    }
    // Busca cuando dejas de escribir (900 ms)
    this.timers[field] = setTimeout(() => this.find(field), 900);
  }

  // Al salir del campo: si el origen quedó vacío, vuelve tu ubicación
  onBlur(field: Field) {
    if (field === 'origin' && !this.originText().trim() && this.lastMyLocation) {
      this.applyMyLocation(this.lastMyLocation);
      return;
    }
    this.find(field);
  }

  // Busca la dirección escrita y pone el punto en el mapa
  async find(field: Field) {
    clearTimeout(this.timers[field]);
    const typed = this.getText(field).trim();
    if (typed.length < 3 || this.getPoint(field)) return;

    const id = ++this.seq[field];
    this.setStatus(field, 'searching');

    // 1.º intento: la dirección completa
    let results = await this.geocode.search(`${typed.replace('#', ' ')}, Neiva`);
    let approx = false;

    // 2.º intento: sin el número (el mapa casi nunca tiene números de casa)
    if (!results.length) {
      const simple = typed
        .replace(/#\s*\w+(\s*-\s*\w+)?/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (simple && simple !== typed) {
        results = await this.geocode.search(`${simple}, Neiva`);
        approx = true;
      }
    }

    if (id !== this.seq[field]) return; // llegó una búsqueda más nueva

    if (!results.length) {
      this.setStatus(field, 'notfound');
      return;
    }

    // Se usan las coordenadas encontradas y el nombre que escribiste
    const p = results[0];
    this.setPoint(field, { name: typed, lat: p.lat, lng: p.lng });
    this.setStatus(field, approx ? 'approx' : 'found');
    this.calculate();
  }

  // ---------- Tu ubicación como origen ----------
  // El mapa la detecta al abrir la pantalla
  onMyLocation(p: MapPoint) {
    this.locationMessage.set('');
    this.lastMyLocation = p;
    // No pisa un origen que ya escribiste o elegiste
    if (this.origin() || this.originText().trim()) return;
    this.applyMyLocation(p);
  }

  private applyMyLocation(p: MapPoint) {
    this.setText('origin', p.name);
    this.setPoint('origin', p);
    this.setStatus('origin', 'found');
    this.originFromGps.set(true);
    this.estimate.set(null);
    this.rideRequest.set(null);
    this.errorMessage.set('');
    this.calculate();
  }

  onLocationError(message: string) {
    this.locationMessage.set(message);
  }

  reset() {
    this.origin.set(null);
    this.destination.set(null);
    this.originText.set('');
    this.destinationText.set('');
    this.status.set({ origin: 'idle', destination: 'idle' });
    this.originFromGps.set(false);
    this.estimate.set(null);
    this.rideRequest.set(null);
    this.errorMessage.set('');
    // Vuelve a poner tu ubicación como origen
    if (this.lastMyLocation) this.applyMyLocation(this.lastMyLocation);
  }

  // ---------- Tarifa y solicitud ----------
  private calculate() {
    const o = this.origin();
    const d = this.destination();
    if (!o || !d) return;

    if (Math.abs(o.lat - d.lat) < 0.0003 && Math.abs(o.lng - d.lng) < 0.0003) {
      this.errorMessage.set('El origen y el destino no pueden ser el mismo lugar.');
      return;
    }

    this.loading.set(true);
    this.fareService
      .estimateFare({
        origin_latitude: o.lat,
        origin_longitude: o.lng,
        destination_latitude: d.lat,
        destination_longitude: d.lng,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.estimate.set(res.estimate);
        },
        error: (err) => {
          this.loading.set(false);
          if (err.status === 401) {
            this.expireSession();
          } else if (err.status === 422) {
            this.errorMessage.set('La ubicación ingresada no es válida.');
          } else {
            this.errorMessage.set('No se pudo calcular la tarifa. Intenta de nuevo.');
          }
        },
      });
  }

  // POST /client/ride-requests
  requestRide() {
    const o = this.origin();
    const d = this.destination();
    if (!o || !d || !this.estimate()) return;

    this.errorMessage.set('');
    this.requesting.set(true);
    this.rideService
      .createRideRequest({
        origin_name: o.name,
        origin_latitude: o.lat,
        origin_longitude: o.lng,
        destination_name: d.name,
        destination_latitude: d.lat,
        destination_longitude: d.lng,
      })
      .subscribe({
        next: (res) => {
          this.requesting.set(false);
          this.rideRequest.set(res.ride_request);
          this.router.navigateByUrl('/trip');
        },
        error: (err) => {
          this.requesting.set(false);
          if (err.status === 401) {
            this.expireSession();
          } else if (err.status === 400) {
            const id = err.error?.active_request_id;
            this.router.navigateByUrl('/trip');
            this.errorMessage.set(
              (err.error?.message || 'Ya cuenta con una solicitud o viaje activo en curso.') +
                (id ? ` (solicitud #${id})` : '')
            );
          } else if (err.status === 422) {
            this.errorMessage.set('Revisa las direcciones y las ubicaciones elegidas.');
          } else {
            this.errorMessage.set('No se pudo enviar la solicitud. Intenta de nuevo.');
          }
        },
      });
  }

  logout() {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login'),
    });
  }

  private expireSession() {
    this.auth.clearSession();
    this.router.navigateByUrl('/login');
  }

  // ---------- Ayudas ----------
  private getText(field: Field) {
    return field === 'origin' ? this.originText() : this.destinationText();
  }
  private setText(field: Field, v: string) {
    (field === 'origin' ? this.originText : this.destinationText).set(v);
  }
  private getPoint(field: Field) {
    return field === 'origin' ? this.origin() : this.destination();
  }
  private setPoint(field: Field, p: MapPoint | null) {
    (field === 'origin' ? this.origin : this.destination).set(p);
  }
  private setStatus(field: Field, s: Status) {
    this.status.update((v) => ({ ...v, [field]: s }));
  }
}