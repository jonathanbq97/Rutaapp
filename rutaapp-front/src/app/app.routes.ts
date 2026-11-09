import type { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

// Pantallas que todavía no están construidas (se reemplazan en los próximos lotes)
const soon = (path: string, title: string, lote: number) => ({
  path,
  loadComponent: () =>
    import('./pages/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
  data: { title, lote },
});

export const routes: Routes = [
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },

  // ----- Páginas públicas -----
  {
    path: 'welcome',
    loadComponent: () => import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },

  // ----- Zona privada: menú lateral según el rol -----
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./components/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      // Perfil (todos los roles)
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },

      // Cliente
      {
        path: 'home',
        canActivate: [roleGuard('client')],
        loadComponent: () =>
          import('./pages/client/client-dashboard.page').then((m) => m.ClientDashboardPage),
      },
      {
        path: 'request',
        canActivate: [roleGuard('client')],
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'trip',
        canActivate: [roleGuard('client')],
        loadComponent: () => import('./pages/trip/trip.page').then((m) => m.TripPage),
      },
      {
        path: 'trips',
        canActivate: [roleGuard('client')],
        loadComponent: () => import('./pages/client/client-trips.page').then((m) => m.ClientTripsPage),
      },

      // Conductor
      {
        path: 'driver',
        canActivate: [roleGuard('driver')],
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/driver/driver-home.page').then((m) => m.DriverHomePage),
          },
          {
            path: 'requests',
            loadComponent: () =>
              import('./pages/driver/driver-requests.page').then((m) => m.DriverRequestsPage),
          },
          {
            path: 'trip',
            loadComponent: () => import('./pages/driver/driver-trip.page').then((m) => m.DriverTripPage),
          },
          {
            path: 'services',
            loadComponent: () =>
              import('./pages/driver/driver-services.page').then((m) => m.DriverServicesPage),
          },
          {
            path: 'income',
            loadComponent: () =>
              import('./pages/driver/driver-income.page').then((m) => m.DriverIncomePage),
          },
        ],
      },

      // Administrador
      {
        path: 'admin',
        canActivate: [roleGuard('admin')],
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/admin/admin-dashboard.page').then((m) => m.AdminDashboardPage),
          },
          {
            path: 'clients',
            loadComponent: () => import('./pages/admin/admin-clients.page').then((m) => m.AdminClientsPage),
          },
          {
            path: 'drivers',
            loadComponent: () => import('./pages/admin/admin-drivers.page').then((m) => m.AdminDriversPage),
          },
          {
            path: 'vehicles',
            loadComponent: () => import('./pages/admin/admin-vehicles.page').then((m) => m.AdminVehiclesPage),
          },
          {
            path: 'requests',
            loadComponent: () => import('./pages/admin/admin-requests.page').then((m) => m.AdminRequestsPage),
          },
          {
            path: 'trips',
            loadComponent: () => import('./pages/admin/admin-trips.page').then((m) => m.AdminTripsPage),
          },
          {
            path: 'fares',
            loadComponent: () => import('./pages/admin/admin-fares.page').then((m) => m.AdminFaresPage),
          },
          {
            path: 'reports',
            loadComponent: () => import('./pages/admin/admin-reports.page').then((m) => m.AdminReportsPage),
          },
          {
            path: 'audit',
            loadComponent: () => import('./pages/admin/admin-audit.page').then((m) => m.AdminAuditPage),
          },
        ],
      },
    ],
  },

  { path: '**', redirectTo: 'welcome' },
];
