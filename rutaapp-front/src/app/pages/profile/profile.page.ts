import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular';
import { AuthService } from '../../services/auth';

const ROLES: Record<string, string> = {
  client: 'Pasajero',
  driver: 'Conductor',
  admin: 'Administrador',
};

const APPROVAL: Record<string, string> = {
  pending: 'Pendiente de aprobación',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IonContent, IonButton, IonSpinner],
  template: `
    <ion-content [fullscreen]="true">
      <div class="page-wrap">
        <h1 class="page-title">Mi perfil</h1>

        @if (loading()) {
          <div class="panel center"><ion-spinner name="dots"></ion-spinner></div>
        } @else if (user(); as u) {
          <div class="panel">
            <h2>{{ u.name }}</h2>
            <p class="muted">{{ roleLabel() }}</p>
            <dl class="kv">
              <dt>Correo</dt><dd>{{ u.email }}</dd>
              <dt>Teléfono</dt><dd>{{ u.phone }}</dd>
              <dt>Estado de la cuenta</dt><dd>{{ u.status === 'active' ? 'Activa' : u.status }}</dd>
            </dl>
          </div>

          @if (u.driver; as d) {
            <div class="panel">
              <h2>Datos de conductor</h2>
              <dl class="kv">
                <dt>Aprobación</dt>
                <dd><span class="pill" [attr.data-s]="d.approval_status">{{ approval(d.approval_status) }}</span></dd>
                <dt>Licencia</dt><dd>{{ d.license_number }}</dd>
                <dt>Calificación</dt><dd>⭐ {{ d.rating_average }}</dd>
              </dl>
              @if (u.vehicle; as v) {
                <h2 class="sub">Vehículo</h2>
                <dl class="kv">
                  <dt>Placa</dt><dd>{{ v.plate }}</dd>
                  <dt>Marca y modelo</dt><dd>{{ v.brand }} {{ v.model }} ({{ v.year }})</dd>
                  <dt>Color</dt><dd>{{ v.color || '—' }}</dd>
                  <dt>Capacidad</dt><dd>{{ v.capacity }} pasajeros</dd>
                </dl>
              }
            </div>
          }
        } @else {
          <div class="panel"><p class="muted">{{ error() }}</p></div>
        }

        <ion-button fill="outline" (click)="logout()">Cerrar sesión</ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .page-title { margin: 0 0 18px; font-size: 28px; font-weight: 700; }
    .center { text-align: center; }
    .kv { display: grid; grid-template-columns: 170px 1fr; gap: 10px 16px; margin: 14px 0 0; }
    .kv dt { opacity: 0.65; }
    .kv dd { margin: 0; font-weight: 500; }
    .sub { margin-top: 24px; font-size: 18px; }
    .pill { padding: 4px 12px; border-radius: 999px; font-size: 13px; background: rgba(251,191,36,.2); border: 1px solid rgba(251,191,36,.6); }
    .pill[data-s='approved'] { background: rgba(34,197,94,.2); border-color: rgba(74,222,128,.6); }
    .pill[data-s='rejected'], .pill[data-s='suspended'] { background: rgba(239,68,68,.2); border-color: rgba(248,113,113,.6); }
  `],
})
export class ProfilePage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(true);
  user = signal<any>(null);
  error = signal('');
  roleLabel = computed(() => ROLES[this.user()?.role] ?? '');

  ngOnInit() {
    // GET /auth/me
    this.auth.me().subscribe({
      next: (res) => {
        this.user.set(res.user);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar tu perfil.');
        this.loading.set(false);
      },
    });
  }

  approval(status: string) {
    return APPROVAL[status] ?? status;
  }

  logout() {
    const go = () => this.router.navigateByUrl('/login');
    this.auth.logout().subscribe({ next: go, error: go });
  }
}
