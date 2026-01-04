import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';

import { AuthService } from './auth.service';
import type { AppRole } from './roles';
import { userHasRole } from './roles';

export function roleGuard(role: AppRole): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) return router.parseUrl('/login');

    const user = auth.user$();
    if (user && userHasRole(user, role)) return true;
    if (user && !userHasRole(user, role)) return router.parseUrl('/');

    return auth.loadMe().pipe(map((loaded) => (userHasRole(loaded || undefined, role) ? true : router.parseUrl('/'))));
  };
}

export const adminGuard: CanActivateFn = roleGuard('admin');
export const approverGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.parseUrl('/login');

  const user = auth.user$();
  if (user && (userHasRole(user, 'approver') || userHasRole(user, 'admin'))) return true;
  if (user) return router.parseUrl('/');

  return auth.loadMe().pipe(
    map((loaded) => (userHasRole(loaded || undefined, 'approver') || userHasRole(loaded || undefined, 'admin') ? true : router.parseUrl('/')))
  );
};
export const procurementGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.parseUrl('/login');

  const user = auth.user$();
  if (user && (userHasRole(user, 'procurement') || userHasRole(user, 'admin'))) return true;
  if (user) return router.parseUrl('/');

  return auth.loadMe().pipe(
    map((loaded) => (userHasRole(loaded || undefined, 'procurement') || userHasRole(loaded || undefined, 'admin') ? true : router.parseUrl('/')))
  );
};
