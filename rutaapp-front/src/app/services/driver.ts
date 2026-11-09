import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private apiUrl = `${environment.apiUrl}/driver`;

  // Modo demo: la pantalla del viaje envía posiciones simuladas en lugar del GPS real
  readonly simulating = signal(false);

  private watchId?: number;
  private tripId: number | null = null;
  private lastSent = 0;

  constructor(private http: HttpClient) {}

  // PUT /driver/availability
  setAvailability(status: 'available' | 'unavailable'): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/availability`, { status });
  }

  // GET /driver/ride-requests
  getRequests(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ride-requests`);
  }

  // POST /driver/ride-requests/{id}/accept
  accept(requestId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ride-requests/${requestId}/accept`, {});
  }

  // POST /driver/trips/{id}/arrive
  arrive(tripId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/trips/${tripId}/arrive`, {});
  }

  // POST /driver/trips/{id}/start
  start(tripId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/trips/${tripId}/start`, {});
  }

  // POST /driver/trips/{id}/complete
  complete(tripId: number, distanceKm: number, durationMin: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/trips/${tripId}/complete`, {
      actual_distance_km: distanceKm,
      actual_duration_min: durationMin,
    });
  }

  // POST /driver/location
  sendLocation(latitude: number, longitude: number, tripId?: number | null): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/location`, {
      latitude,
      longitude,
      ...(tripId ? { trip_id: tripId } : {}),
    });
  }

  // --- Endpoints extra (hay que confirmar con el profesor si existen) ---
  getActive(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/active`);
  }

  getTrips(status = '', page = 1): Observable<any> {
    let params = new HttpParams().set('page', String(page));
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${this.apiUrl}/trips`, { params });
  }

  getSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/summary`);
  }

  getRatings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ratings`);
  }

  // ---------- Envío automático del GPS mientras hay un viaje activo ----------
  setActiveTrip(id: number | null) {
    this.tripId = id;

    if (id && this.watchId === undefined && 'geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (this.simulating() || !this.tripId) return;
          const now = Date.now();
          if (now - this.lastSent < 4000) return; // máximo una vez cada 4 segundos
          this.lastSent = now;
          this.sendLocation(pos.coords.latitude, pos.coords.longitude, this.tripId).subscribe({
            error: () => {},
          });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    }

    if (!id && this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = undefined;
    }
  }
}
