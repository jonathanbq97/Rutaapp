import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../environments/environment';

export type Role = 'client' | 'driver' | 'admin';

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'client' | 'driver';
  license_number?: string;
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  capacity?: number;
  color?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;

  // Usuario de la sesión actual (se actualiza al iniciar y cerrar sesión)
  readonly user = signal<any>(this.loadUser());

  constructor(private http: HttpClient) {}

  // POST /auth/login
  login(login: string, password: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/login`, { login, password })
      .pipe(tap((res) => this.saveSession(res)));
  }

  // POST /auth/register (cliente o conductor)
  register(data: RegisterData): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/register`, data)
      .pipe(tap((res) => this.saveSession(res)));
  }

  // GET /auth/me
  me(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/me`);
  }

  // POST /auth/forgot-password
  forgotPassword(email: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/forgot-password`, {
      email,
      new_password: newPassword,
    });
  }

  // POST /auth/logout: invalida el token en el servidor y borra la sesión local
  logout(): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/logout`, {})
      .pipe(finalize(() => this.clearSession()));
  }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.user.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRole(): Role | null {
    return (this.user()?.role as Role) ?? null;
  }

  // Pantalla de inicio según el rol
  homeFor(role: Role | null): string {
    switch (role) {
      case 'client':
        return '/home';
      case 'driver':
        return '/driver';
      case 'admin':
        return '/admin';
      default:
        return '/login';
    }
  }

  private saveSession(res: any): void {
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.user.set(res.user);
  }

  private loadUser(): any {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }
}
