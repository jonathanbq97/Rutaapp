import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RideRequestBody {
  origin_name: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_name: string;
  destination_latitude: number;
  destination_longitude: number;
}

export interface RatingBody {
  score: number;
  comment?: string;
  has_incident?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RideService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // POST /client/ride-requests
  createRideRequest(data: RideRequestBody): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/client/ride-requests`, data);
  }

  // GET /client/active
  getActive(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/client/active`);
  }

  // POST /client/cancel/{id} (el id es el de la solicitud o el del viaje, según "type")
  cancel(id: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/client/cancel/${id}`, { reason });
  }

  // GET /client/trips (historial paginado)
  getTrips(status = '', page = 1): Observable<any> {
    let params = new HttpParams().set('page', String(page));
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${this.apiUrl}/client/trips`, { params });
  }

  // POST /client/trips/{id}/rating
  rate(tripId: number, body: RatingBody): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/client/trips/${tripId}/rating`, body);
  }
}
