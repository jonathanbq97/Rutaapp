import { Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonRouterOutlet } from '@ionic/angular';
import { AuthService, Role } from '../../services/auth';

interface MenuItem {
  label: string;
  icon: string;
  path: string;
  exact?: boolean;
}

const MENUS: Record<Role, MenuItem[]> = {
  client: [
    { label: 'Inicio', icon: '🏠', path: '/home' },
    { label: 'Solicitar viaje', icon: '🚗', path: '/request' },
    { label: 'Mi viaje', icon: '📍', path: '/trip' },
    { label: 'Mis viajes', icon: '🧾', path: '/trips' },
    { label: 'Perfil', icon: '👤', path: '/profile' },
  ],
  driver: [
    { label: 'Inicio', icon: '🏠', path: '/driver', exact: true },
    { label: 'Solicitudes', icon: '📍', path: '/driver/requests' },
    { label: 'Viaje actual', icon: '🚗', path: '/driver/trip' },
    { label: 'Mis servicios', icon: '🧾', path: '/driver/services' },
    { label: 'Ingresos', icon: '💰', path: '/driver/income' },
    { label: 'Perfil', icon: '👤', path: '/profile' },
  ],
  admin: [
    { label: 'Dashboard', icon: '📊', path: '/admin', exact: true },
    { label: 'Clientes', icon: '👥', path: '/admin/clients' },
    { label: 'Conductores', icon: '🛡️', path: '/admin/drivers' },
    { label: 'Vehículos', icon: '🚙', path: '/admin/vehicles' },
    { label: 'Solicitudes', icon: '📍', path: '/admin/requests' },
    { label: 'Viajes', icon: '🧾', path: '/admin/trips' },
    { label: 'Tarifas', icon: '💲', path: '/admin/fares' },
    { label: 'Reportes', icon: '📈', path: '/admin/reports' },
    { label: 'Auditoría', icon: '🔍', path: '/admin/audit' },
    { label: 'Perfil', icon: '👤', path: '/profile' },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  client: 'Pasajero',
  driver: 'Conductor',
  admin: 'Administrador',
};

@Component({
  selector: 'app-shell',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ion-page' },
  imports: [RouterLink, RouterLinkActive, IonRouterOutlet],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="logo">Ruta<span>App</span></div>
        <div class="who">
          <strong>{{ auth.user()?.name }}</strong>
          <small>{{ roleLabel() }}</small>
        </div>
        <nav class="nav">
          @for (m of menu(); track m.path) {
            <a class="item" [routerLink]="m.path" routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: m.exact ?? false }">
              <span class="ico">{{ m.icon }}</span>
              <span class="txt">{{ m.label }}</span>
            </a>
          }
        </nav>
        <button type="button" class="logout" (click)="logout()">Cerrar sesión</button>
      </aside>

      <main class="shell-main">
        <ion-router-outlet></ion-router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .shell { display: flex; flex: 1; min-height: 0; width: 100%; }

    .shell .sidebar {
      width: 240px;
      flex: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 22px 14px;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.05);
      border-right: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
    }
    .shell .logo { padding: 0 10px; font-size: 26px; font-weight: 800; letter-spacing: -1px; }
    .shell .logo span { color: #3b82f6; }
    .shell .who {
      display: flex; flex-direction: column;
      margin: 6px 0 12px; padding: 10px 12px;
      border-radius: 14px; background: rgba(255, 255, 255, 0.06);
    }
    .shell .who small { opacity: 0.65; }
    .shell .nav { display: flex; flex: 1; flex-direction: column; gap: 4px; }
    .shell .item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px; font-size: 15px;
      color: inherit; text-decoration: none; border-radius: 14px;
    }
    .shell .item:hover { background: rgba(255, 255, 255, 0.08); }
    .shell .item.active {
      font-weight: 600;
      background: rgba(47, 107, 255, 0.28);
      box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.55);
    }
    .shell .ico { width: 24px; text-align: center; }
    .shell .logout {
      padding: 12px; font: inherit; color: inherit; cursor: pointer;
      background: transparent; border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .shell .logout:hover { background: rgba(255, 255, 255, 0.08); }

    .shell-main { position: relative; flex: 1; min-width: 0; min-height: 0; }

    /* Las pantallas del cliente ya traían su propia barra superior: se oculta */
    .shell-main .topbar { display: none !important; }
    .shell-main .home, .shell-main .trip { padding-top: 24px !important; }

    /* Estilos compartidos por las pantallas del panel */
    .page-wrap { max-width: 1100px; margin: 0 auto; padding: 28px 20px 40px; }
    .panel {
      margin-bottom: 18px; padding: 24px 22px;
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.18);
      box-shadow: 0 0 40px rgba(47, 107, 255, 0.2), inset 0 0 30px rgba(255, 255, 255, 0.04);
      backdrop-filter: blur(12px);
    }
    .panel h2 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
    .panel .muted { margin: 0; opacity: 0.7; }

    /* Celular: el menú pasa a una barra inferior */
    @media (max-width: 800px) {
      .shell { flex-direction: column; }
      .shell .sidebar {
        order: 2; width: 100%; flex-direction: row; gap: 2px;
        padding: 8px 6px calc(8px + env(safe-area-inset-bottom, 0px));
        overflow-x: auto; overflow-y: hidden;
        border-right: 0; border-top: 1px solid rgba(255, 255, 255, 0.12);
      }
      .shell .logo, .shell .who, .shell .logout { display: none; }
      .shell .nav { flex-direction: row; gap: 2px; }
      .shell .item { flex-direction: column; gap: 2px; padding: 8px 10px; font-size: 11px; white-space: nowrap; }
      .shell-main { order: 1; }
    }
  `, `
    /* Piezas compartidas por los paneles */
    .page-title { margin: 0 0 18px; font-size: 28px; font-weight: 700; }
    .two-col { display: grid; grid-template-columns: minmax(300px, 400px) 1fr; gap: 20px; align-items: start; }
    .two-col .map-panel { position: sticky; top: 12px; padding: 10px; }
    .two-col .map-panel .map-picker { min-height: 480px; }
    .row { display: flex; align-items: center; gap: 10px; margin: 8px 0; font-size: 14px; }
    .row.between { justify-content: space-between; gap: 16px; }
    .dot { flex: none; width: 12px; height: 12px; border-radius: 50%; background: #2f6bff; }
    .dot.d { background: #ff7a1a; }
    .price { margin: 4px 0 8px; font-size: 32px; font-weight: 800; color: #60a5fa; }
    .strong { margin: 0; font-size: 18px; font-weight: 600; }
    .warn-panel { border-color: rgba(251, 191, 36, 0.6); }
    .msg { margin: 12px 0 0; font-size: 14px; color: #fbbf24; }
    .msg.err { color: #f87171; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 14px; }
    .chip { padding: 6px 12px; font-size: 13px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.14); }
    .chip-btn { padding: 8px 16px; font: inherit; font-size: 14px; color: inherit; cursor: pointer; border-radius: 999px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.18); }
    .chip-btn.on { font-weight: 600; background: rgba(47, 107, 255, 0.35); border-color: rgba(96, 165, 250, 0.7); }
    .table-wrap { overflow-x: auto; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl th { padding: 10px 12px; text-align: left; font-weight: 500; white-space: nowrap; opacity: 0.65; border-bottom: 1px solid rgba(255, 255, 255, 0.14); }
    .tbl td { padding: 12px; vertical-align: top; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .filters { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    .ctl {
      padding: 10px 12px; font: inherit; font-size: 14px; color: inherit; border-radius: 12px;
      background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2);
      color-scheme: dark; min-width: 180px;
    }
    .ctl option { color: #000; }
    @media (max-width: 800px) {
      .two-col { grid-template-columns: 1fr; }
      .two-col .map-panel { position: static; }
    }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  role = computed<Role>(() => (this.auth.user()?.role as Role) ?? 'client');
  menu = computed(() => MENUS[this.role()]);
  roleLabel = computed(() => ROLE_LABELS[this.role()]);

  logout() {
    const go = () => this.router.navigateByUrl('/login');
    this.auth.logout().subscribe({ next: go, error: go });
  }
}
