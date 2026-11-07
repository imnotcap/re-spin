'use server';
/**
 * Handlinger i admin. HVER handling kalder requireStaff(rettighed) igen (uafhængigt af siden, der viste knappen)
 * og skriver i audit-loggen. Next afviser server actions fra fremmede oprindelser (CSRF).
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { schema } from '@respin/db';
import { staffReply, updateCase } from '@respin/support';
import type { Permission } from '@respin/security';
import { audit, requireDb, requireStaff } from './auth';
import { MONEY_ACTIONS, decideApproval, isMoneyAction, requestMoneyAction } from './orders';
import { handleReport, moderateListing, setUserStatus } from './people';

const str = (fd: FormData, k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : ''; };
export type ActionState = { error?: string; ok?: string; at?: number } | undefined;

/* ------------------------------ Kundeservice ------------------------------ */

export async function replyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const staff = await requireStaff('support.handle');
  const caseId = str(fd, 'caseId');
  const internal = str(fd, 'internal') === '1';
  const status = str(fd, 'status') || undefined;
  const r = await staffReply(requireDb(), staff.id, caseId, { body: str(fd, 'body'), internal, ...(status ? { status } : {}) });
  if (!r.ok) return { error: r.error === 'not_found' ? 'Sagen findes ikke.' : 'Skriv en besked (højst 4.000 tegn).' };
  await audit({ actorType: 'staff', actorId: staff.id, action: internal ? 'support.note' : 'support.reply', targetType: 'support_case', targetId: caseId, ip: staff.ip, metadata: status ? { status } : {} });
  revalidatePath(`/support/${caseId}`);
  return { ok: internal ? 'Noten er gemt.' : 'Svaret er sendt.', at: Date.now() };
}

export async function updateCaseAction(fd: FormData): Promise<void> {
  const staff = await requireStaff('support.handle');
  const caseId = str(fd, 'caseId');
  const patch: Record<string, string | null> = {};
  for (const k of ['status', 'priority'] as const) if (str(fd, k)) patch[k] = str(fd, k);
  if (fd.has('assigneeId')) patch.assigneeId = str(fd, 'assigneeId') === 'me' ? staff.id : str(fd, 'assigneeId') || null;
  const r = await updateCase(requireDb(), caseId, patch);
  if (r.ok) await audit({ actorType: 'staff', actorId: staff.id, action: 'support.update', targetType: 'support_case', targetId: caseId, ip: staff.ip, metadata: patch });
  revalidatePath(`/support/${caseId}`);
  revalidatePath('/support');
}

/* ------------------------------ Penge ------------------------------ */

export async function moneyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const action = str(fd, 'action');
  if (!isMoneyAction(action)) return { error: 'Ukendt handling.' };
  const staff = await requireStaff(MONEY_ACTIONS[action].permission);
  const orderId = str(fd, 'orderId');
  const r = await requestMoneyAction(requireDb(), staff.id, orderId, action, str(fd, 'reason'));
  if (!r.ok) {
    const msg = { invalid_reason: 'Skriv en begrundelse på 5–500 tegn.', not_found: 'Ordren findes ikke.', already_requested: 'Der venter allerede en anmodning om godkendelse på denne ordre.', not_allowed: r.message, failed: r.message } as const;
    return { error: msg[r.error] ?? 'Det lykkedes ikke.' };
  }
  await audit({ actorType: 'staff', actorId: staff.id, action: r.outcome === 'executed' ? `order.${action}` : 'approval.requested', targetType: 'order', targetId: orderId, ip: staff.ip, metadata: { action, reason: str(fd, 'reason').slice(0, 500), approvalId: r.approvalId } });
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}?${r.outcome === 'executed' ? 'udfoert' : 'anmodet'}=1`);
}

export async function decideAction(fd: FormData): Promise<void> {
  const id = str(fd, 'id');
  const [a] = /^[0-9a-f-]{36}$/i.test(id) ? await requireDb().select({ permission: schema.adminApprovals.permission, targetId: schema.adminApprovals.targetId }).from(schema.adminApprovals).where(eq(schema.adminApprovals.id, id)) : [];
  // Godkenderen skal selv have rettigheden til handlingen (ukendt → kræv admin-rettighed)
  const staff = await requireStaff((a?.permission as Permission | undefined) ?? 'staff.manage');
  const approve = str(fd, 'decision') === 'approve';
  const r = await decideApproval(requireDb(), staff.id, id, approve, str(fd, 'note'));
  await audit({ actorType: 'staff', actorId: staff.id, action: r.ok ? (approve ? 'approval.approved' : 'approval.rejected') : 'approval.failed', targetType: 'approval', targetId: id, ip: staff.ip, metadata: r.ok ? {} : { error: r.error, message: r.message } });
  revalidatePath('/approvals');
  if (a) revalidatePath(`/orders/${a.targetId}`);
  redirect(`/approvals?${r.ok ? 'udfoert' : `fejl=${r.error}`}=1`);
}

/* ------------------------------ Brugere og moderation ------------------------------ */

export async function userStatusAction(fd: FormData): Promise<void> {
  const staff = await requireStaff('user.suspend');
  const id = str(fd, 'userId');
  const status = str(fd, 'status') === 'suspended' ? 'suspended' : 'active';
  const reason = str(fd, 'reason').trim().slice(0, 500);
  if (status === 'suspended' && reason.length < 5) redirect(`/users/${id}?fejl=begrundelse`);
  const ok = await setUserStatus(requireDb(), id, status);
  await audit({ actorType: 'staff', actorId: staff.id, action: status === 'suspended' ? 'user.suspended' : 'user.reactivated', targetType: 'user', targetId: id, ip: staff.ip, metadata: { reason, ok } });
  revalidatePath(`/users/${id}`);
  redirect(`/users/${id}?${status === 'suspended' ? 'spaerret' : 'genaabnet'}=1`);
}

export async function moderateAction(fd: FormData): Promise<void> {
  const staff = await requireStaff('listing.moderate');
  const id = str(fd, 'listingId');
  const decision = str(fd, 'decision') === 'approved' ? 'approved' : 'rejected';
  const ok = await moderateListing(requireDb(), id, decision);
  if (ok) await audit({ actorType: 'staff', actorId: staff.id, action: `listing.${decision}`, targetType: 'listing', targetId: id, ip: staff.ip });
  revalidatePath('/moderation');
}

export async function reportAction(fd: FormData): Promise<void> {
  const staff = await requireStaff('report.handle');
  const id = str(fd, 'reportId');
  const decision = str(fd, 'decision') === 'actioned' ? 'actioned' : 'dismissed';
  const ok = await handleReport(requireDb(), id, staff.id, decision);
  if (ok) await audit({ actorType: 'staff', actorId: staff.id, action: `report.${decision}`, targetType: 'report', targetId: id, ip: staff.ip });
  revalidatePath('/moderation');
}
