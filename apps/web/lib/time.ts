/** Korte tidsangivelser (kan bruges i browseren) */
const TZ = 'Europe/Copenhagen';
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });

/** "08.13" i dag, "I går", ellers "3. nov." */
export function shortWhen(d: Date, now = new Date()): string {
  if (dayKey(d) === dayKey(now)) return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  if (dayKey(d) === dayKey(new Date(now.getTime() - 86_400_000))) return 'I går';
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', timeZone: TZ });
}
