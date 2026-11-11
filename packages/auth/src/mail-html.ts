/**
 * HTML-mails i Videros tema: skovgrøn top med logo, hvidt kort på cremefarvet baggrund og en lime knap.
 * Bygget med tabeller og inline-styles, fordi mailprogrammer (Gmail, Outlook, Apple Mail) ikke forstår
 * moderne CSS, eksterne stylesheets eller SVG. Alt dynamisk indhold escapes. Mailen virker også uden billeder:
 * logoet har alt-tekst, og navnet "videro" står som tekst ved siden af.
 */

const C = {
  forest: '#0e5a2f', lime: '#d2ff32', cream: '#fdfbf7', white: '#ffffff',
  ink: '#1c1c1c', body: '#3b3b38', muted: '#6a6a64', border: '#e4e2dd'
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
  /** Afsnit (ren tekst – escapes) */
  paragraphs: string[];
  button: { label: string; href: string };
  /** Lille tekst under knappen, fx hvor længe linket virker */
  note?: string;
  /** Afsluttende tekst under stregen, fx "Har du ikke oprettet en konto …" */
  footnote?: string;
}

export function renderMail(m: MailLayout): string {
  const href = safeUrl(m.button.href);
  const origin = new URL(href).origin;
  const logo = `${origin}/img/mail/logo-lime.png`;
  const p = (t: string) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:24px;color:${C.body};">${esc(t)}</p>`;

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
      <tr><td style="background-color:${C.forest};border-radius:16px 16px 0 0;padding:28px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;padding-right:10px;"><img src="${esc(logo)}" width="36" height="36" alt="" style="display:block;border:0;width:36px;height:36px;"></td>
          <td style="vertical-align:middle;font-family:${FONT};font-size:28px;line-height:32px;font-weight:800;letter-spacing:-1px;color:${C.white};">videro</td>
        </tr></table>
      </td></tr>
      <!-- Indhold -->
      <tr><td style="background-color:${C.white};border:1px solid ${C.border};border-top:0;border-radius:0 0 16px 16px;padding:36px 32px 32px;">
        <h1 style="margin:0 0 16px;font-family:${FONT};font-size:26px;line-height:32px;font-weight:800;letter-spacing:-0.5px;color:${C.ink};">${esc(m.heading)}</h1>
        ${m.paragraphs.map(p).join('\n        ')}
        <!-- Knap (virker også i Outlook) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;"><tr>
          <td align="center" bgcolor="${C.lime}" style="border-radius:10px;background-color:${C.lime};">
            <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:15px 28px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:${C.forest};text-decoration:none;border-radius:10px;">${esc(m.button.label)}</a>
          </td>
        </tr></table>
        ${m.note ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:14px;line-height:20px;color:${C.muted};">${esc(m.note)}</p>` : ''}
        <!-- Link som tekst, hvis knappen ikke virker -->
        <p style="margin:24px 0 0;font-family:${FONT};font-size:13px;line-height:19px;color:${C.muted};">Virker knappen ikke? Kopiér linket ind i din browser:<br>
          <a href="${esc(href)}" target="_blank" style="color:${C.forest};text-decoration:underline;word-break:break-all;">${esc(href)}</a></p>
        ${m.footnote ? `<hr style="border:0;border-top:1px solid ${C.border};margin:28px 0 20px;">
        <p style="margin:0;font-family:${FONT};font-size:13px;line-height:19px;color:${C.muted};">${esc(m.footnote)}</p>` : ''}
      </td></tr>
      <!-- Bund -->
      <tr><td align="center" style="padding:24px 16px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};">
        Videro · Køb og sælg brugt med køberbeskyttelse<br>
        <a href="${esc(origin)}/" target="_blank" style="color:${C.muted};text-decoration:underline;">${esc(new URL(origin).host)}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
