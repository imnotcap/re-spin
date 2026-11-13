/**
 * HTML-mails i Videros tema: skovgrøn top med logo, hvidt kort på cremefarvet baggrund og en lime knap.
 * Bygget med tabeller og inline-styles, fordi mailprogrammer (Gmail, Outlook, Apple Mail) ikke forstår
 * moderne CSS, eksterne stylesheets eller SVG. Alt dynamisk indhold escapes. Mailen virker også uden billeder:
 * logoet har alt-tekst, og navnet "videro" står som tekst ved siden af.
 *
 * Selve linket står ikke i brødteksten – kun bag knappen. Nederst i mailen står adressen som tekst, så modtageren
 * kan se, at den går til videro.dk (og kopiere den, hvis knappen ikke virker).
 */

const C = {
  forest: '#0e5a2f', lime: '#d2ff32', cream: '#fdfbf7', white: '#ffffff', sage: '#eef4ef',
  ink: '#1c1c1c', body: '#3b3b38', muted: '#6a6a64', border: '#e4e2dd',
  warnBg: '#fff7e6', warnBorder: '#f3d9a4', warnText: '#7a4b00'
} as const;
const FONT = "'Schibsted Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Escape til HTML-tekst og attributværdier */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Kun http(s)-links i knapper og href – aldrig javascript: o.l. */
function safeUrl(u: string): string {
  const url = new URL(u);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Ugyldigt link i mail');
  return url.toString();
}

export interface MailLayout {
  /** Grå tekst, som mailprogrammet viser efter emnet i indbakken */
  preheader: string;
  heading: string;
  /** Afsnit (ren tekst – escapes). Linjeskift i et afsnit bevares. */
  paragraphs: string[];
  /** Citat, fx den nye besked i en samtale */
  quote?: { author: string; text: string };
  /** Oversigt, fx en ordre: rækker med etiket og værdi; `total` står fremhævet nederst */
  details?: { rows: Array<[string, string]>; total?: [string, string] };
  /** Gul boks til noget vigtigt, fx "Var det ikke dig?" */
  alert?: string;
  button: { label: string; href: string };
  /** Ekstra, mindre link under knappen, fx "Glemt adgangskode?" */
  secondary?: { label: string; href: string };
  /** Lille tekst under knappen, fx hvor længe linket virker */
  note?: string;
  /** Afsluttende tekst under stregen, fx "Har du ikke oprettet en konto …" */
  footnote?: string;
  /** Hvorfor modtageren får mailen – står i bunden */
  reason?: string;
}

const p = (t: string) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:24px;color:${C.body};">${esc(t).replace(/\n/g, '<br>')}</p>`;

function detailsTable(d: NonNullable<MailLayout['details']>): string {
  const row = ([k, v]: [string, string], strong = false) => `<tr>
            <td style="padding:${strong ? '12px' : '6px'} 0 ${strong ? '0' : '6px'};font-family:${FONT};font-size:15px;line-height:22px;color:${strong ? C.ink : C.muted};${strong ? 'font-weight:700;' : ''}">${esc(k)}</td>
            <td align="right" style="padding:${strong ? '12px' : '6px'} 0 ${strong ? '0' : '6px'};font-family:${FONT};font-size:15px;line-height:22px;color:${C.ink};font-weight:${strong ? 800 : 600};white-space:nowrap;">${esc(v)}</td>
          </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;background-color:${C.sage};border-radius:12px;">
      <tr><td style="padding:14px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${d.rows.map((r) => row(r)).join('')}
          ${d.total ? `<tr><td colspan="2" style="border-top:1px solid ${C.border};font-size:0;line-height:0;padding-top:6px;">&nbsp;</td></tr>${row(d.total, true)}` : ''}
        </table>
      </td></tr>
    </table>`;
}

export function renderMail(m: MailLayout): string {
  const href = safeUrl(m.button.href);
  const secondary = m.secondary ? { ...m.secondary, href: safeUrl(m.secondary.href) } : null;
  const origin = new URL(href).origin;
  const host = new URL(origin).host;
  const logo = `${origin}/img/mail/logo-lime.png`;

  return `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(m.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.cream};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(m.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.cream};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <!-- Top med logo -->
      <tr><td style="background-color:${C.forest};border-radius:16px 16px 0 0;padding:26px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;padding-right:10px;"><img src="${esc(logo)}" width="34" height="34" alt="" style="display:block;border:0;width:34px;height:34px;"></td>
          <td style="vertical-align:middle;font-family:${FONT};font-size:26px;line-height:30px;font-weight:800;letter-spacing:-1px;color:${C.white};">videro</td>
        </tr></table>
      </td></tr>
      <!-- Indhold -->
      <tr><td style="background-color:${C.white};border:1px solid ${C.border};border-top:0;padding:36px 32px 28px;">
        <h1 style="margin:0 0 16px;font-family:${FONT};font-size:26px;line-height:32px;font-weight:800;letter-spacing:-0.5px;color:${C.ink};">${esc(m.heading)}</h1>
        ${m.paragraphs.map(p).join('\n        ')}
        ${m.quote ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;"><tr>
          <td style="border-left:4px solid ${C.lime};background-color:${C.sage};border-radius:0 12px 12px 0;padding:14px 18px;">
            <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;line-height:18px;font-weight:700;color:${C.forest};">${esc(m.quote.author)}</p>
            <p style="margin:0;font-family:${FONT};font-size:16px;line-height:24px;color:${C.ink};">${esc(m.quote.text).replace(/\n/g, '<br>')}</p>
          </td></tr></table>` : ''}
        ${m.details ? detailsTable(m.details) : ''}
        ${m.alert ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;"><tr>
          <td style="background-color:${C.warnBg};border:1px solid ${C.warnBorder};border-radius:12px;padding:14px 18px;font-family:${FONT};font-size:15px;line-height:22px;color:${C.warnText};">${esc(m.alert)}</td>
          </tr></table>` : ''}
        <!-- Knap (virker også i Outlook) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;"><tr>
          <td align="center" bgcolor="${C.lime}" style="border-radius:10px;background-color:${C.lime};">
            <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:15px 28px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:${C.forest};text-decoration:none;border-radius:10px;">${esc(m.button.label)}</a>
          </td>
        </tr></table>
        ${secondary ? `<p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:22px;"><a href="${esc(secondary.href)}" target="_blank" style="color:${C.forest};font-weight:600;text-decoration:underline;">${esc(secondary.label)}</a></p>` : ''}
        ${m.note ? `<p style="margin:10px 0 0;font-family:${FONT};font-size:14px;line-height:20px;color:${C.muted};">${esc(m.note)}</p>` : ''}
        ${m.footnote ? `<hr style="border:0;border-top:1px solid ${C.border};margin:28px 0 20px;">
        <p style="margin:0;font-family:${FONT};font-size:14px;line-height:21px;color:${C.muted};">${esc(m.footnote)}</p>` : ''}
      </td></tr>
      <!-- Linket som tekst – til at tjekke afsenderen og som reserve, hvis knappen ikke virker -->
      <tr><td style="background-color:${C.sage};border:1px solid ${C.border};border-top:0;border-radius:0 0 16px 16px;padding:16px 32px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};">
        Knappen fører til en side på ${esc(host)}. Virker den ikke, så kopiér adressen ind i din browser:<br>
        <a href="${esc(href)}" target="_blank" style="color:${C.forest};text-decoration:underline;word-break:break-all;">${esc(href)}</a><br>
        Videro beder aldrig om din adgangskode eller betaling via mail.
      </td></tr>
      <!-- Bund -->
      <tr><td align="center" style="padding:22px 16px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};">
        ${m.reason ? `${esc(m.reason)}<br>` : ''}Mailen er sendt automatisk – svar ikke på den.<br><br>
        <b style="color:${C.body};">Videro</b> · Køb og sælg brugt med køberbeskyttelse<br>
        <a href="${esc(origin)}/" target="_blank" style="color:${C.muted};text-decoration:underline;">${esc(host)}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
