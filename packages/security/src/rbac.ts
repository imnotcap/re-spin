/**
 * Roller og rettigheder for medarbejdere. Deny-by-default: ukendt rolle eller rettighed → nej.
 * Rollen kommer fra staff_users (ikke fra tokenet), så en fratrådt medarbejder kan spærres med det samme.
 */
export const ROLES = ['support', 'moderator', 'finance', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'user.view', 'user.suspend', 'listing.view', 'listing.moderate', 'report.handle',
  'order.view', 'order.refund', 'order.resolve_dispute', 'payout.view', 'ledger.view',
  'fees.edit', 'staff.manage', 'audit.view', 'support.handle'
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, readonly Permission[]> = {
  support:   ['user.view', 'listing.view', 'order.view', 'report.handle', 'support.handle'],
  moderator: ['user.view', 'user.suspend', 'listing.view', 'listing.moderate', 'report.handle', 'order.view', 'support.handle'],
  finance:   ['user.view', 'order.view', 'order.refund', 'order.resolve_dispute', 'payout.view', 'ledger.view', 'audit.view', 'support.handle'],
  admin:     [...PERMISSIONS]
};

export function can(role: string | null | undefined, permission: string): boolean {
  // Object.hasOwn: 'constructor', '__proto__' osv. er ikke roller
  if (!role || !Object.hasOwn(MATRIX, role)) return false;
  return (MATRIX[role as Role] as readonly string[]).includes(permission);
}

/** Refunderinger fra og med dette beløb kræver en anden godkender (fire-øjne-princip) */
export const FOUR_EYES_REFUND_THRESHOLD_ORE = 100_000; // 1.000 kr.

/** Handlinger der altid kræver to personer, uanset beløb */
const ALWAYS_TWO: readonly Permission[] = ['fees.edit', 'staff.manage'];

export function needsSecondApproval(permission: Permission, amountOre?: number): boolean {
  if (ALWAYS_TWO.includes(permission)) return true;
  if (permission === 'order.refund' || permission === 'order.resolve_dispute') return (amountOre ?? Infinity) >= FOUR_EYES_REFUND_THRESHOLD_ORE;
  return false;
}

/** Godkenderen skal være en anden person, aktiv, og selv have rettigheden. */
export function canApprove(input: { requesterId: string; approverId: string; approverRole: string; permission: Permission }): boolean {
  return input.requesterId !== input.approverId && can(input.approverRole, input.permission);
}

/** Beskyttede admin-ruter → påkrævet rettighed. Ikke-listede ruter afvises (deny-by-default). */
export const ADMIN_ROUTE_PERMISSIONS: ReadonlyArray<readonly [prefix: string, permission: Permission]> = [
  ['/users', 'user.view'], ['/listings', 'listing.view'], ['/moderation', 'report.handle'], ['/orders', 'order.view'],
  ['/payouts', 'payout.view'], ['/ledger', 'ledger.view'], ['/settings/fees', 'fees.edit'], ['/staff', 'staff.manage'], ['/audit', 'audit.view'],
  ['/support', 'support.handle'], ['/approvals', 'order.refund']
];

/** '/' (dashboard) er åben for alle gyldige medarbejdere; alt andet skal matche en rute-regel. */
export function permissionForAdminPath(pathname: string): Permission | 'any-staff' | null {
  if (pathname === '/' ) return 'any-staff';
  const hit = ADMIN_ROUTE_PERMISSIONS.find(([p]) => pathname === p || pathname.startsWith(p + '/'));
  return hit ? hit[1] : null;
}
