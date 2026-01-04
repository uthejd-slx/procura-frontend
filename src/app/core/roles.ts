import type { ApiUser } from './types';

export type AppRole = 'employee' | 'approver' | 'procurement' | 'admin';

export function userHasRole(user: ApiUser | null | undefined, role: AppRole): boolean {
  if (!user) return false;
  const roles = user.roles || [];
  if (role === 'employee') return true;
  return roles.includes(role);
}

