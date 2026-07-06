import type { User } from '../types';

export const ROLE_IDS = {
  ADMIN_GLOBAL: 1,
  GERENTE_TIENDA: 2,
  OPERADOR_SEGURIDAD: 3,
  AUDITOR: 4,
  SERVICIO_AUTO: 5,
} as const;

export type RoleCode = keyof typeof ROLE_IDS;

const ROLE_LABELS: Record<RoleCode, string> = {
  ADMIN_GLOBAL: 'Admin global',
  GERENTE_TIENDA: 'Gerente de tienda',
  OPERADOR_SEGURIDAD: 'Operador de seguridad',
  AUDITOR: 'Auditor',
  SERVICIO_AUTO: 'Servicio automático',
};

function normalizeRoleCode(value?: string | null): RoleCode | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_');
  return normalized in ROLE_IDS ? (normalized as RoleCode) : null;
}

export function getRoleCode(user?: User | null): RoleCode | null {
  const explicitCode = normalizeRoleCode(user?.rol_codigo || user?.rol);
  if (explicitCode) return explicitCode;

  const roleId = Number(user?.id_rol);
  const match = Object.entries(ROLE_IDS).find(([, id]) => id === roleId);
  return match ? (match[0] as RoleCode) : null;
}

export function getRoleLabel(user?: User | null) {
  const code = getRoleCode(user);
  return code ? ROLE_LABELS[code] : 'Rol no definido';
}

export function userHasRole(user: User | null | undefined, allowedRoles: RoleCode[]) {
  const code = getRoleCode(user);
  return Boolean(code && allowedRoles.includes(code));
}

export const routeAccess = {
  dashboard: ['ADMIN_GLOBAL', 'GERENTE_TIENDA', 'AUDITOR'],
  eventos: ['ADMIN_GLOBAL', 'GERENTE_TIENDA', 'OPERADOR_SEGURIDAD', 'AUDITOR'],
  grabaciones: ['ADMIN_GLOBAL', 'GERENTE_TIENDA', 'OPERADOR_SEGURIDAD', 'AUDITOR'],
  reportes: ['ADMIN_GLOBAL', 'GERENTE_TIENDA', 'OPERADOR_SEGURIDAD', 'AUDITOR'],
  analisisIa: ['ADMIN_GLOBAL', 'GERENTE_TIENDA', 'AUDITOR'],
  catalogos: ['ADMIN_GLOBAL', 'GERENTE_TIENDA'],
} satisfies Record<string, RoleCode[]>;

export const canCreateGlobalUsers = ['ADMIN_GLOBAL'] satisfies RoleCode[];
