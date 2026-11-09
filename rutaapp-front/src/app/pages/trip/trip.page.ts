import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonInput, IonSpinner } from '@ionic/angular';
import { AuthService } from '../../services/auth';
import { RideService } from '../../services/ride';
import { MapPoint } from '../../services/geocode';
import { MapPickerComponent } from '../../components/map-picker/map-picker.component';
import { RatingFormComponent } from '../../components/rating-form/rating-form.component';

const LABELS: Record<string, string> = {
  requested: 'Buscando conductor…',
  assigned: 'Tu conductor va en camino',
  driver_arrived: 'Tu conductor llegó',
  in_progress: 'Viaje en curso',
};

const samePoint = (a: MapPoint | null, b: MapPoint | null) =>
  a?.lat === b?.lat && a?.lng === b?.lng;

@Component({
  selector: 'app-trip',
  templateUrl: './trip.page.html',
  styleUrls: ['./trip.page.scss'],
  standalone: true,
  imports: [DecimalPipe, MapPickerComponent, RatingFormComponent, IonContent, IonButton, IonInput, IonSpinner],
})
export class TripPage implements OnInit, OnDestroy {
  private rides = inject(RideService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(true);
  hasActive = signal(false);
  type = signal<'request' | 'trip' | null>(null);
  data = signal<any>(null);
  errorMessage = signal('');
  endedMessage = signal('Pide un viaje desde "Solicitar viaje" para verlo aquí.');

  // Calificación al terminar el viaje
  toRate = signal<any>(null);

  // Cancelación
  confirming = signal(false);
  reason = signal('');
  cancelling = signal(false);
  cancelMessage = signal('');

  private timer: any;
  private wasActive = false;

  statusLabel = computed(() => LABELS[this.data()?.status] ?? '');
  // Solo se puede cancelar antes de que empiece el recorrido
  cancellable = computed(() => ['requested', 'assigned', 'driver_arrived'].includes(this.data()?.status));

  origin = computed<MapPoint | null>(
    () => {
      const d = this.data();
      return d?.origin_latitude != null
        ? { name: d.origin_name || 'Origen', lat: d.origin_latitude, lng: d.origin_longitude }
        : null;
    },
    { equal: samePoint }
  );

  destination = computed<MapPoint | null>(
    () => {
      const d = this.data();
      return d?.destination_latitude != null
        ? { name: d.destination_name || 'Destino', lat: d.destination_latitude, lng: d.destination_longitude }
        : null;
    },
    { equal: samePoint }
  );

  driverPoint = computed<MapPoint | null>(
    () => {
      const l = this.data()?.driver?.latest_location;
      return l ? { name: 'Conductor', lat: l.latitude, lng: l.longitude } : null;
    },
    { equal: samePoint }
  );

  ngOnInit() {
    this.load();
    // Consulta el estado cada 5 segundos
    this.timer = setInterval(() => this.load(), 5000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  // GET /client/active
  private load() {
    this.rides.getActive().subscribe({
      next: (res) => {
        this.loading.set(false);
        this.errorMessage.set('');
        if (res.has_active) {
          this.wasActive = true;
          this.toRate.set(null);
          this.hasActive.set(true);
          this.type.set(res.type);
          this.data.set(res.data);
        } else {
          this.hasActive.set(false);
          this.data.set(null);
          this.confirming.set(false);
          if (this.wasActive) {
            this.wasActive = false;
            this.checkRating();
          }
        }
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.auth.clearSession();
          this.router.navigateByUrl('/login');
        } else {
          this.errorMessage.set('No se pudo actualizar el estado del viaje.');
        }
      },
    });
  }

  // El viaje terminó: si se completó y no está calificado, se invita a calificarlo
  private checkRating() {
    this.rides.getTrips('', 1).subscribe({
      next: (res) => {
        const last = res.trips?.data?.[0];
        if (last?.status === 'completed' && !last.rating) {
          this.toRate.set(last);
          this.endedMessage.set('Tu viaje terminó. ¡Gracias por viajar con RutaApp!');
        } else if (last?.status === 'cancelled') {
          this.endedMessage.set('Este viaje fue cancelado.');
        } else {
          this.endedMessage.set('Tu viaje terminó. ¡Gracias por viajar con RutaApp!');
        }
      },
      error: () => this.endedMessage.set('Tu viaje terminó. ¡Gracias por viajar con RutaApp!'),
    });
  }

  askCancel() {
    this.cancelMessage.set('');
    this.confirming.set(true);
  }

  keepTrip() {
    this.confirming.set(false);
    this.cancelMessage.set('');
  }

  // POST /client/cancel/{id}
  confirmCancel() {
    const d = this.data();
    if (!d) return;
    this.cancelling.set(true);
    this.cancelMessage.set('');
    this.rides.cancel(d.id, this.reason().trim() || 'Cancelado por el cliente').subscribe({
      next: () => {
        this.cancelling.set(false);
        this.confirming.set(false);
        this.reason.set('');
        this.wasActive = false; // ya lo sabemos: no hace falta pedir calificación
        this.endedMessage.set('Cancelaste tu viaje. Puedes pedir otro cuando quieras.');
        this.load();
      },
      error: (err) => {
        this.cancelling.set(false);
        this.cancelMessage.set(err.error?.message || 'No se pudo cancelar el viaje.');
        this.load();
      },
    });
  }

  onRated() {
    // Deja el formulario visible con su mensaje de agradecimiento
    this.endedMessage.set('¡Gracias por calificar tu viaje!');
  }

  goRequest() {
    this.router.navigateByUrl('/request');
  }

  goTrips() {
    this.router.navigateByUrl('/trips');
  }
}
