import { renderMail } from './mail-html';

export { renderMail, esc as escapeHtml, type MailLayout } from './mail-html';

/** E-mail-afsendelse. Produktion skal bruge en rigtig udbyder (DKIM); konsol-afsenderen afvises i produktion. */
/** `text` sendes altid (læses af mailprogrammer uden HTML og af spamfiltre); `html` er den pæne udgave, hvor den findes. */
export interface Mail { to: string; subject: string; text: string; html?: string }
export interface Mailer { send(mail: Mail): Promise<void> }

export class ConsoleMailer implements Mailer {
  async send(mail: Mail): Promise<void> {
    if (process.env.NODE_ENV === 'production') throw new Error('ConsoleMailer må ikke bruges i produktion');
    console.info(`[mail] til=${mail.to} emne="${mail.subject}"\n${mail.text}\n[/mail]`);
  }
}

export class MemoryMailer implements Mailer {
  readonly sent: Mail[] = [];
  async send(mail: Mail): Promise<void> { this.sent.push(mail); }
  linkFrom(index = -1): string {
    const m = this.sent.at(index);
    const link = m?.text.match(/https?:\/\/\S+/)?.[0];
    if (!link) throw new Error('Ingen link i mail');
    return link;
  }
}

export interface ResendMailerOptions {
  /** API-nøgle fra Resend ("re_…"). Opbevares som secret i hosting-platformen – aldrig i koden. */
  apiKey: string;
  /** Afsender, fx "Videro <noreply@videro.dk>". Domænet skal være verificeret hos Resend (SPF/DKIM). */
  from: string;
  /** Til tests */
  fetch?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
}

/**
 * Én adresse: lokal-del@domæne med mindst ét punktum inde i domænet. Lineær tid (ingen regex med
 * overlappende gentagelser, som kan bruges til ReDoS) og højst 254 tegn (RFC 5321).
 */
const ADDRESS_SHAPE = /^[^\s@<>"(),;:]+@[^\s@<>"(),;:]+$/;
export function isSingleAddress(s: string): boolean {
  if (s.length > 254 || !ADDRESS_SHAPE.test(s)) return false;
  const domain = s.slice(s.indexOf('@') + 1);
  const dot = domain.indexOf('.', 1);
  return dot !== -1 && dot < domain.length - 1;
}
/** Afsender: "Navn <adresse>" (navn højst 60 tegn, uden linjeskift) eller blot adressen */
const NAMED = /^(?:([^<>\r\n"]{1,60}) )?<([^<>]{1,254})>$/;
function isValidFrom(s: string): boolean {
  const m = NAMED.exec(s);
  return isSingleAddress(m ? m[2]! : s);
}

/**
 * Sender via Resends HTTPS-API (https://resend.com/docs/api-reference/emails/send-email).
 * Sikkerhed: afviser linjeskift i modtager/emne (header-injektion), én modtager pr. mail,
 * timeout, ingen omdirigeringer, og fejlbeskeder indeholder aldrig nøglen eller svarteksten.
 */
export class ResendMailer implements Mailer {
  private readonly o: Required<Omit<ResendMailerOptions, 'fetch'>> & { fetch: typeof fetch };
  constructor(o: ResendMailerOptions) {
    if (!/^re_[A-Za-z0-9_-]{8,}$/.test(o.apiKey)) throw new Error('RESEND_API_KEY har et ugyldigt format');
    if (!isValidFrom(o.from)) throw new Error('MAIL_FROM skal være "Navn <adresse@domæne>" eller en adresse');
    this.o = { endpoint: 'https://api.resend.com/emails', timeoutMs: 10_000, fetch: globalThis.fetch.bind(globalThis), ...o };
  }

  async send(mail: Mail): Promise<void> {
    if (!isSingleAddress(mail.to) || /[\r\n]/.test(mail.subject) || mail.subject.length > 200) throw new Error('Ugyldig modtager eller emne');
    let res: Response;
    try {
      res = await this.o.fetch(this.o.endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.o.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.o.from, to: [mail.to], subject: mail.subject, text: mail.text, ...(mail.html ? { html: mail.html } : {}) }),
        redirect: 'error',
        signal: AbortSignal.timeout(this.o.timeoutMs)
      });
    } catch (e) {
      throw new Error(`Mail kunne ikke sendes (${e instanceof Error && e.name === 'TimeoutError' ? 'timeout' : 'netværk'})`);
    }
    if (!res.ok) throw new Error(`Mail kunne ikke sendes (HTTP ${res.status})`);
  }
}

const WHY_ACCOUNT = 'Du får denne mail, fordi den handler om din konto på Videro.';

export const templates = {
  verify: (link: string): Omit<Mail, 'to'> => ({
    subject: 'Bekræft din e-mail til Videro',
    text: `Hej!\n\nBekræft din e-mail ved at åbne linket og logge ind med den adgangskode, du valgte:\n${link}\n\nLinket virker i 24 timer. Har du ikke oprettet en konto, kan du se bort fra denne mail.\n\n– Videro`,
    html: renderMail({
      preheader: 'Ét klik mere, så er din Videro-konto klar.',
      heading: 'Bekræft din e-mail',
      paragraphs: [
        'Hej, og velkommen til Videro!',
        'Tryk på knappen for at bekræfte din e-mail. Derefter logger du ind med den adgangskode, du valgte – og så er du klar til at købe og sælge brugt tøj og ting.'
      ],
      button: { label: 'Bekræft e-mail', href: link },
      note: 'Linket virker i 24 timer.',
      footnote: 'Har du ikke oprettet en konto på Videro, kan du se bort fra denne mail. Der sker ikke noget, før linket bliver brugt.',
      reason: 'Du får denne mail, fordi nogen har oprettet en Videro-konto med din e-mail.'
    })
  }),
  alreadyRegistered: (loginLink: string, resetLink: string): Omit<Mail, 'to'> => ({
    subject: 'Forsøg på at oprette en konto med din e-mail',
    text: `Hej!\n\nNogen (måske dig) forsøgte at oprette en ny Videro-konto med din e-mail. Du har allerede en konto.\n\nLog ind: ${loginLink}\nGlemt adgangskode: ${resetLink}\n\nVar det ikke dig, behøver du ikke gøre noget.\n\n– Videro`,
    html: renderMail({
      preheader: 'Du har allerede en konto – log ind i stedet.',
      heading: 'Du har allerede en konto',
      paragraphs: [
        'Hej!',
        'Nogen – måske dig – forsøgte at oprette en ny Videro-konto med din e-mail. Der findes allerede en konto med den, så der er ikke oprettet en ny.'
      ],
      button: { label: 'Log ind', href: loginLink },
      secondary: { label: 'Glemt din adgangskode?', href: resetLink },
      footnote: 'Var det ikke dig, behøver du ikke gøre noget. Din konto er uændret.',
      reason: WHY_ACCOUNT
    })
  }),
  reset: (link: string): Omit<Mail, 'to'> => ({
    subject: 'Nulstil din adgangskode til Videro',
    text: `Hej!\n\nVælg en ny adgangskode her:\n${link}\n\nLinket virker i 30 minutter og kan kun bruges én gang. Bad du ikke om det, kan du se bort fra denne mail – din adgangskode er uændret.\n\n– Videro`,
    html: renderMail({
      preheader: 'Vælg en ny adgangskode – linket virker i 30 minutter.',
      heading: 'Nulstil din adgangskode',
      paragraphs: ['Hej!', 'Vi har fået en anmodning om at nulstille adgangskoden til din Videro-konto. Tryk på knappen for at vælge en ny.'],
      button: { label: 'Vælg ny adgangskode', href: link },
      note: 'Linket virker i 30 minutter og kan kun bruges én gang.',
      footnote: 'Bad du ikke om det, kan du se bort fra denne mail – din adgangskode er uændret.',
      reason: WHY_ACCOUNT
    })
  }),
  securityChange: (what: string, resetLink: string): Omit<Mail, 'to'> => ({
    subject: `Sikkerhedsændring på din konto: ${what}`,
    text: `Hej!\n\nDer er lige foretaget en sikkerhedsændring på din Videro-konto: ${what}.\n\nVar det ikke dig? Nulstil din adgangskode straks: ${resetLink}\n\n– Videro`,
    html: renderMail({
      preheader: `Ændring på din konto: ${what}.`,
      heading: 'Sikkerhedsændring på din konto',
      paragraphs: ['Hej!', `Der er lige foretaget en sikkerhedsændring på din Videro-konto: ${what}.`, 'Var det dig, behøver du ikke gøre noget.'],
      alert: 'Var det ikke dig? Nulstil din adgangskode med det samme. Så bliver du logget ud alle andre steder.',
      button: { label: 'Nulstil adgangskode', href: resetLink },
      reason: WHY_ACCOUNT
    })
  }),
  passwordChanged: (resetLink: string): Omit<Mail, 'to'> => ({
    subject: 'Din adgangskode er ændret',
    text: `Hej!\n\nAdgangskoden til din Videro-konto er lige blevet ændret, og du er logget ud på alle andre enheder.\n\nVar det ikke dig? Nulstil straks: ${resetLink}\n\n– Videro`,
    html: renderMail({
      preheader: 'Adgangskoden til din Videro-konto er ændret.',
      heading: 'Din adgangskode er ændret',
      paragraphs: ['Hej!', 'Adgangskoden til din Videro-konto er lige blevet ændret, og du er logget ud på alle andre enheder.', 'Var det dig, behøver du ikke gøre noget.'],
      alert: 'Var det ikke dig? Nulstil din adgangskode med det samme.',
      button: { label: 'Nulstil adgangskode', href: resetLink },
      reason: WHY_ACCOUNT
    })
  })
};
