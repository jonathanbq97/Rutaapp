import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

type Query = Record<string, string | number | null | undefined>;

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  private params(obj: Query): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    }
    return p;
  }

  // GET /admin/dashboard
  dashboard(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`);
  }

  // GET /admin/drivers?approval_status=
  drivers(approvalStatus = ''): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/drivers`, {
      params: this.params({ approval_status: approvalStatus }),
    });
  }

  // PATCH /admin/drivers/{id}/approval
  setApproval(id: number, status: string, notes = ''): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/drivers/${id}/approval`, {
      approval_status: status,
      ...(notes ? { admin_notes: notes } : {}),
    });
  }

  // GET /admin/fares
  fares(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/fares`);
  }

  // POST /admin/fares
  createFare(body: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/fares`, body);
  }

  // GET /admin/trips?status=&driver_id=&client_id=&date=
  trips(filters: Query, page = 1): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/trips`, {
      params: this.params({ ...filters, page }),
    });
  }

  // GET /admin/reports
  reports(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reports`);
  }

  // GET /admin/audit-logs
  auditLogs(page = 1): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/audit-logs`, { params: this.params({ page }) });
  }

  // --- Endpoints extra (hay que confirmar con el profesor si existen) ---
  clients(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/clients`);
  }

  vehicles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vehicles`);
  }

  requests(status = '', page = 1): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/requests`, { params: this.params({ status, page }) });
  }
}
