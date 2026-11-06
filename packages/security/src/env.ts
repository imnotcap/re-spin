import { z } from 'zod';

/**
 * Indlæs og valider miljøvariabler ved opstart – appen starter ikke med manglende/ugyldig konfiguration (fail closed).
 * Fejlbeskeder nævner variabelnavne, ALDRIG værdier.
 */
export function loadEnv<S extends z.ZodType>(schema: S, source: Record<string, string | undefined> = process.env): z.infer<S> {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.') || '(env)'}: ${i.message}`).join('; ');
    throw new Error(`Ugyldig konfiguration: ${problems}`);
  }
  return parsed.data;
}

/** Kommasepareret liste → array (tomme linjer fjernes) */
export const csv = z.string().default('').transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean));
