/**
 * Markedspladsens typiske svindel er at flytte samtalen/betalingen væk fra platformen ("send til MobilePay",
 * "skriv til mig på WhatsApp"), fordi køberbeskyttelsen så ikke gælder. Vi blokerer ikke, men flager til
 * moderation og viser køber en advarsel. Heuristik – ikke et sikkerhedsværn alene.
 */
export type RiskFlag = 'off_platform_payment' | 'external_contact' | 'external_link' | 'phone_number' | 'email_address';
export type RiskLevel = 'low' | 'medium' | 'high';

const PATTERNS: Array<[RiskFlag, RegExp]> = [
  ['off_platform_payment', /\b(mobile\s?pay|mobilepay|revolut|paypal|swish|western\s?union|bank\s?overf\w*|overf[øo]r\w*|reg\.?\s?nr|konto\s?nr|iban|gavekort)\b/i],
  ['external_contact', /\b(whatsapp|telegram|signal|snap(chat)?|messenger|facebook|instagram|insta)\b/i],
  ['external_link', /(https?:\/\/|www\.)\S+/i],
  ['phone_number', /(?:\+?45[\s-]?)?\b\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}\b/],
  ['email_address', /[^\s@]+@[^\s@]+\.[a-z]{2,}/i]
];

export interface RiskAssessment { level: RiskLevel; flags: RiskFlag[] }

export function assessMessageRisk(message: string): RiskAssessment {
  const flags = PATTERNS.filter(([, re]) => re.test(message)).map(([flag]) => flag);
  const level: RiskLevel = flags.includes('off_platform_payment') || flags.length >= 2 ? 'high' : flags.length === 1 ? 'medium' : 'low';
  return { level, flags };
}
