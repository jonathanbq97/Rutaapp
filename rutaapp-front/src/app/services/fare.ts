import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EstimateRequest {
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
}

@Injectable({ providedIn: 'root' })
export class FareService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // GET /fares/active (público)
  getActiveFare(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/fares/active`);
  }

  // POST /client/estimate-fare (el interceptor agrega el token)
  estimateFare(data: EstimateRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/client/estimate-fare`, data);
  }
}