import { createHash, randomBytes } from 'node:crypto';

/** 256 bit tilfældigt token (base64url). Bruges til sessioner og engangslinks. */
export const randomToken = (): string => randomBytes(32).toString('base64url');
/** Tokens gemmes kun som SHA-256 (højentropi-tokens kræver ikke langsom hashing). */
export const sha256Hex = (value: string): string => createHash('sha256').update(value).digest('hex');
export const sha1Hex = (value: string): string => createHash('sha1').update(value).digest('hex').toUpperCase();
