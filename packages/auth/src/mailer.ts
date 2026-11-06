/** E-mail-afsendelse. Produktion skal bruge en rigtig udbyder (DKIM); konsol-afsenderen afvises i produktion. */
export interface Mail { to: string; subject: string; text: string }
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

export const templates = {
  verify: (link: string): Omit<Mail, 'to'> => ({
    subject: 'Bekræft din e-mail til re:spin',
    text: `Hej!\n\nBekræft din e-mail ved at åbne linket og logge ind med den adgangskode, du valgte:\n${link}\n\nLinket virker i 24 timer. Har du ikke oprettet en konto, kan du se bort fra denne mail.\n\n– re:spin`
  }),
  alreadyRegistered: (loginLink: string, resetLink: string): Omit<Mail, 'to'> => ({
    subject: 'Forsøg på at oprette en konto med din e-mail',
    text: `Hej!\n\nNogen (måske dig) forsøgte at oprette en ny re:spin-konto med din e-mail. Du har allerede en konto.\n\nLog ind: ${loginLink}\nGlemt adgangskode: ${resetLink}\n\nVar det ikke dig, behøver du ikke gøre noget.\n\n– re:spin`
  }),
  reset: (link: string): Omit<Mail, 'to'> => ({
    subject: 'Nulstil din adgangskode til re:spin',
    text: `Hej!\n\nVælg en ny adgangskode her:\n${link}\n\nLinket virker i 30 minutter og kan kun bruges én gang. Bad du ikke om det, kan du se bort fra denne mail – din adgangskode er uændret.\n\n– re:spin`
  }),
  securityChange: (what: string, resetLink: string): Omit<Mail, 'to'> => ({
    subject: `Sikkerhedsændring på din konto: ${what}`,
    text: `Hej!\n\nDer er lige foretaget en sikkerhedsændring på din re:spin-konto: ${what}.\n\nVar det ikke dig? Nulstil din adgangskode straks: ${resetLink}\n\n– re:spin`
  }),
  passwordChanged: (resetLink: string): Omit<Mail, 'to'> => ({
    subject: 'Din adgangskode er ændret',
    text: `Hej!\n\nAdgangskoden til din re:spin-konto er lige blevet ændret, og du er logget ud på alle andre enheder.\n\nVar det ikke dig? Nulstil straks: ${resetLink}\n\n– re:spin`
  })
};
