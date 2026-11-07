import type { SupportStatus } from '@respin/support';

/** Farve på status-mærket i kundens oversigt */
export const STATUS_TONE: Record<SupportStatus, 'forest' | 'warn' | 'neutral'> = { open: 'forest', pending_customer: 'warn', resolved: 'neutral', closed: 'neutral' };
