/**
 * Audit-log: hvem gjorde hvad, hvornår, hvorfra. Bruges til ALLE følsomme handlinger (admin, penge, kontoændringer).
 * Selve lagringen er en `audit_log`-tabel der er append-only (database-trigger). Metadata redigeres inden lagring.
 */
import { redactForLog } from './redact';

export interface AuditEvent {
  actorType: 'user' | 'staff' | 'system';
  actorId?: string | null;
  action: string;           // fx 'order.refund', 'staff.login', 'fees.edit'
  targetType?: string;
  targetId?: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditSink { write(event: AuditEvent): Promise<void> }

/** Wrapper der altid redigerer metadata, og som aldrig lader en fejl i logning skjule den egentlige handling (men melder den). */
export function createAuditor(sink: AuditSink, onError: (e: unknown) => void = console.error) {
  return {
    async record(event: AuditEvent): Promise<void> {
      try {
        await sink.write({ ...event, userAgent: event.userAgent?.slice(0, 256) ?? null, metadata: redactForLog(event.metadata ?? {}) as Record<string, unknown> });
      } catch (e) { onError(e); }
    }
  };
}
