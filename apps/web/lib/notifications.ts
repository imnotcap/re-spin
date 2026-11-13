import 'server-only';
/**
 * Mails om nye beskeder og svar fra kundeservice. Køres hvert 5. min. af GitHub Actions (.github/workflows/notifications.yml) og dagligt af Vercel Cron → /api/cron/notifikationer/.
 *
 *  - Beskeder: når en besked har været ulæst i 2 minutter (man er ofte på siden og læser den med det samme),
 *    og højst én mail pr. samtale pr. kvarter. Mistænkelige beskeder citeres ikke i mailen (phishing).
 *  - Kundeservice: når en medarbejder har svaret, og kunden ikke har læst det.
 *  - Kun aktive brugere med bekræftet e-mail. Tidspunktet gemmes først, når mailen er sendt (fejl prøves igen).
 */
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { renderMail, type Mailer } from '@respin/auth';

const { conversations, messages, listings, users, supportCases } = schema;

export const MESSAGE_GRACE_MS = 2 * 60_000;
export const MESSAGE_THROTTLE_MS = 15 * 60_000;
export const SUPPORT_GRACE_MS = 60_000;
const BATCH = 50;

const FOOTER = '\n\n—\nDu får denne mail, fordi du har en konto på Videro. Svar ikke på mailen – skriv i stedet på videro.dk.\nBetal aldrig uden om Videro, og klik ikke på links, du får tilsendt i beskeder. Så mister du køberbeskyttelsen.';
const REASON = 'Du får denne mail, fordi du har en konto på Videro.';
const SAFETY = 'Betal aldrig uden om Videro, og klik ikke på links, du får tilsendt i beskeder – så mister du køberbeskyttelsen.';

export interface NotifyResult { messages: number; support: number; failed: number }

export async function runNotifications(db: Db, mailer: Mailer, appUrl: string, now = new Date()): Promise<NotifyResult> {
  const base = appUrl.replace(/\/$/, '');
  const out: NotifyResult = { messages: 0, support: 0, failed: 0 };
  const grace = new Date(now.getTime() - MESSAGE_GRACE_MS);
  const throttle = new Date(now.getTime() - MESSAGE_THROTTLE_MS);

  for (const role of ['buyer', 'seller'] as const) {
    const me = role === 'buyer' ? conversations.buyerId : conversations.sellerId;
    const readAt = role === 'buyer' ? conversations.buyerReadAt : conversations.sellerReadAt;
    const notifiedAt = role === 'buyer' ? conversations.buyerNotifiedAt : conversations.sellerNotifiedAt;
    // Ulæste beskeder fra den anden part, ældre end 2 min., ikke allerede meldt, og ingen mail det seneste kvarter
    const rows = await db.select({
      id: conversations.id, title: listings.title, email: users.email, name: users.displayName,
      unread: sql<number>`(select count(*)::int from ${messages} m where m.conversation_id = ${conversations.id} and m.sender_id <> ${me}
        and m.created_at > coalesce(${readAt}, 'epoch'::timestamptz))`.mapWith(Number),
      lastBody: sql<string | null>`(select body from ${messages} m where m.conversation_id = ${conversations.id} and m.sender_id <> ${me} order by m.created_at desc limit 1)`,
      lastRisk: sql<string | null>`(select risk_level from ${messages} m where m.conversation_id = ${conversations.id} and m.sender_id <> ${me} order by m.created_at desc limit 1)`,
      lastKind: sql<string | null>`(select kind from ${messages} m where m.conversation_id = ${conversations.id} and m.sender_id <> ${me} order by m.created_at desc limit 1)`,
      from: sql<string>`(select u2.display_name from ${users} u2 where u2.id = case when ${conversations.buyerId} = ${me} then ${conversations.sellerId} else ${conversations.buyerId} end)`
    }).from(conversations)
      .innerJoin(listings, eq(listings.id, conversations.listingId))
      .innerJoin(users, eq(users.id, me))
      .where(and(
        eq(users.status, 'active'), isNotNull(users.emailVerifiedAt),
        sql`${conversations.lastMessageAt} <= ${grace.toISOString()}::timestamptz`,
        sql`exists (select 1 from ${messages} m where m.conversation_id = ${conversations.id} and m.sender_id <> ${me}
          and m.created_at > coalesce(${readAt}, 'epoch'::timestamptz) and m.created_at > coalesce(${notifiedAt}, 'epoch'::timestamptz))`,
        sql`(${notifiedAt} is null or ${notifiedAt} <= ${throttle.toISOString()}::timestamptz)`
      )).limit(BATCH);
    for (const r of rows) {
      if (r.unread === 0) continue;
      const what = r.lastKind?.startsWith('offer') ? (r.lastBody ?? 'Nyt om et bud') : r.unread === 1 ? (r.lastKind === 'image' ? 'et billede' : 'en ny besked') : `${r.unread} nye beskeder`;
      const quote = r.lastKind === 'text' && r.lastRisk === 'low' && r.lastBody ? `\n\n“${r.lastBody.length > 200 ? `${r.lastBody.slice(0, 200)}…` : r.lastBody}”` : '';
      try {
        const offer = r.lastKind?.startsWith('offer');
        const link = `${base}/konto/beskeder/${r.id}/`;
        const quoted = r.lastKind === 'text' && r.lastRisk === 'low' && r.lastBody ? (r.lastBody.length > 200 ? `${r.lastBody.slice(0, 200)}…` : r.lastBody) : null;
        await mailer.send({
          to: r.email,
          subject: `${r.from} har skrevet til dig om “${r.title.slice(0, 60)}”`,
          text: `Hej ${r.name}\n\n${r.from} har sendt dig ${offer ? `en opdatering om et bud: ${what}` : what} om “${r.title}”.${quote}\n\nLæs og svar her:\n${link}${FOOTER}`,
          html: renderMail({
            preheader: quoted ?? `${r.from} har skrevet til dig om “${r.title}”.`,
            heading: offer ? 'Nyt om et bud' : r.unread === 1 ? 'Du har en ny besked' : `Du har ${r.unread} nye beskeder`,
            paragraphs: [`Hej ${r.name}`, `${r.from} har sendt dig ${offer ? `en opdatering om et bud: ${what}` : what} om “${r.title}”.`],
            ...(quoted ? { quote: { author: r.from, text: quoted } } : {}),
            button: { label: offer ? 'Se buddet' : 'Læs og svar', href: link },
            footnote: SAFETY,
            reason: REASON
          })
        });
        await db.update(conversations).set(role === 'buyer' ? { buyerNotifiedAt: now } : { sellerNotifiedAt: now }).where(eq(conversations.id, r.id));
        out.messages++;
      } catch (e) {
        out.failed++;
        console.error('notifikation-fejl', e instanceof Error ? e.message : 'ukendt');
      }
    }
  }

  const cases = await db.select({ id: supportCases.id, number: supportCases.number, subject: supportCases.subject, email: users.email, name: users.displayName })
    .from(supportCases).innerJoin(users, eq(users.id, supportCases.userId))
    .where(and(
      eq(supportCases.customerUnread, true), eq(users.status, 'active'), isNotNull(users.emailVerifiedAt), isNotNull(supportCases.lastStaffAt),
      sql`${supportCases.lastStaffAt} <= ${new Date(now.getTime() - SUPPORT_GRACE_MS).toISOString()}::timestamptz`,
      sql`(${supportCases.customerNotifiedAt} is null or ${supportCases.customerNotifiedAt} < ${supportCases.lastStaffAt})`
    )).limit(BATCH);
  for (const c of cases) {
    try {
      const link = `${base}/konto/support/${c.number}/`;
      await mailer.send({
        to: c.email,
        subject: `Svar fra Videro kundeservice (sag #${c.number})`,
        text: `Hej ${c.name}\n\nVi har svaret på din henvendelse “${c.subject}” (sag #${c.number}).\n\nLæs svaret her:\n${link}${FOOTER}`,
        html: renderMail({
          preheader: `Vi har svaret på “${c.subject}”.`,
          heading: 'Du har fået svar fra kundeservice',
          paragraphs: [`Hej ${c.name}`, `Vi har svaret på din henvendelse “${c.subject}” (sag #${c.number}). Af hensyn til dit privatliv står svaret kun på Videro – log ind for at læse det.`],
          button: { label: 'Læs svaret', href: link },
          reason: REASON
        })
      });
      await db.update(supportCases).set({ customerNotifiedAt: now }).where(eq(supportCases.id, c.id));
      out.support++;
    } catch (e) {
      out.failed++;
      console.error('notifikation-fejl', e instanceof Error ? e.message : 'ukendt');
    }
  }
  return out;
}
