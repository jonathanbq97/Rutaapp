import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from '../services/auth';

// Deja entrar solo a los roles indicados; si no, manda al usuario a su propio inicio
export const roleGuard =
  (...roles: Role[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      return router.parseUrl('/login');
    }
    const role = auth.getRole();
    if (role && roles.includes(role)) {
      return true;
    }
    return router.parseUrl(auth.homeFor(role));
  };
