import 'server-only';
/**
 * Mails om ordrer (køres af cron): sælger får besked om salget med frist og link til adressen, køber får en
 * ordrebekræftelse, og køber får besked, når varen er sendt. Tidspunktet gemmes først, når mailen er sendt.
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { schema, type Db } from '@respin/db';
import { renderMail, type Mailer } from '@respin/auth';
import { formatOre, ore } from '@respin/core/money';

const { orders, listings, users } = schema;
const FOOTER = '\n\n—\nDu får denne mail, fordi du har handlet på Videro. Svar ikke på mailen – skriv i stedet på videro.dk.';
const REASON = 'Du får denne mail, fordi du har handlet på Videro.';
const date = (d: Date | null) => (d ? d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', timeZone: 'Europe/Copenhagen' }) : '');

export async function runOrderMails(db: Db, mailer: Mailer, appUrl: string, now = new Date()): Promise<{ sent: number; failed: number }> {
  const base = appUrl.replace(/\/$/, '');
  const out = { sent: 0, failed: 0 };
  const person = async (id: string) => (await db.select({ email: users.email, name: users.displayName }).from(users).where(eq(users.id, id)))[0];

  const paid = await db.select({ o: orders, title: listings.title }).from(orders).innerJoin(listings, eq(listings.id, orders.listingId))
    .where(and(inArray(orders.status, ['paid', 'shipped', 'delivered', 'completed']), isNull(orders.paidNotifiedAt))).limit(50);
  for (const { o, title } of paid) {
    try {
      const [seller, buyer] = [await person(o.sellerId), await person(o.buyerId)];
      const orderLink = `${base}/konto/ordrer/${o.id}/`;
      if (seller) await mailer.send({ to: seller.email, subject: `Du har solgt “${title.slice(0, 60)}”`,
        text: `Hej ${seller.name}\n\nTillykke – “${title}” er solgt og betalt. Du får ${formatOre(ore(o.sellerPayoutOre))}, når køberen har modtaget varen.\n\nSend varen senest ${date(o.shipByAt)}. ${o.servicePoint ? 'Fragten er betalt – hent din fragtlabel her, og aflever pakken i en pakkeshop' : 'Køberens adresse står her'}:\n${orderLink}\n\nHar du ikke oprettet en udbetalingskonto endnu, så gør det nu – pengene venter sikkert hos vores betalingsudbyder:\n${base}/konto/udbetalinger/${FOOTER}`,
        html: renderMail({
          preheader: `Tillykke – “${title}” er solgt. Send varen senest ${date(o.shipByAt)}.`,
          heading: 'Tillykke, du har solgt!',
          paragraphs: [`Hej ${seller.name}`, `“${title}” er solgt og betalt. Du får pengene, når køberen har modtaget varen.`,
            o.servicePoint ? 'Fragten er betalt. Hent din fragtlabel, og aflever pakken i en pakkeshop.' : 'Køberens adresse står på ordren.'],
          details: { rows: [['Vare', title], ['Send senest', date(o.shipByAt)]], total: ['Du får', formatOre(ore(o.sellerPayoutOre))] },
          button: { label: o.servicePoint ? 'Hent fragtlabel' : 'Se ordren', href: orderLink },
          secondary: { label: 'Opret eller tjek din udbetalingskonto', href: `${base}/konto/udbetalinger/` },
          note: 'Har du ikke oprettet en udbetalingskonto endnu, så gør det nu – pengene venter sikkert hos vores betalingsudbyder.',
          reason: REASON
        }) });
      if (buyer) await mailer.send({ to: buyer.email, subject: `Ordrebekræftelse: “${title.slice(0, 60)}”`,
        text: `Hej ${buyer.name}\n\nTak for dit køb. Du har betalt ${formatOre(ore(o.buyerTotalOre))} (vare ${formatOre(ore(o.priceOre))}, køberbeskyttelse ${formatOre(ore(o.buyerFeeOre))}, fragt ${formatOre(ore(o.shippingOre))}).\n\nSælgeren sender varen senest ${date(o.shipByAt)}. Vi holder pengene, til du har modtaget den. Følg ordren her:\n${orderLink}\n\nDu køber af en privatperson, så forbrugerkøbsloven og fortrydelsesretten gælder ikke – men Videros køberbeskyttelse gør.${FOOTER}`,
        html: renderMail({
          preheader: `Tak for dit køb af “${title}”. Sælgeren sender senest ${date(o.shipByAt)}.`,
          heading: 'Tak for dit køb',
          paragraphs: [`Hej ${buyer.name}`, `Du har købt “${title}”. Sælgeren sender varen senest ${date(o.shipByAt)}, og vi holder pengene, til du har modtaget den.`],
          details: {
            rows: [['Vare', formatOre(ore(o.priceOre))], ['Køberbeskyttelse', formatOre(ore(o.buyerFeeOre))], ['Fragt', formatOre(ore(o.shippingOre))]],
            total: ['Betalt i alt', formatOre(ore(o.buyerTotalOre))]
          },
          button: { label: 'Følg ordren', href: orderLink },
          footnote: 'Du køber af en privatperson, så forbrugerkøbsloven og fortrydelsesretten gælder ikke – men Videros køberbeskyttelse gør.',
          reason: REASON
        }) });
      await db.update(orders).set({ paidNotifiedAt: now }).where(eq(orders.id, o.id));
      out.sent++;
    } catch (e) { out.failed++; console.error('ordremail-fejl', e instanceof Error ? e.message : 'ukendt'); }
  }

  const shipped = await db.select({ o: orders, title: listings.title }).from(orders).innerJoin(listings, eq(listings.id, orders.listingId))
    .where(and(eq(orders.status, 'shipped'), isNull(orders.shippedNotifiedAt))).limit(50);
  for (const { o, title } of shipped) {
    try {
      const buyer = await person(o.buyerId);
      const track = o.trackingNumber ? `\nSporingsnummer${o.carrier ? ` (${o.carrier})` : ''}: ${o.trackingNumber}` : '';
      const orderLink = `${base}/konto/ordrer/${o.id}/`;
      if (buyer) await mailer.send({ to: buyer.email, subject: `Din vare er sendt: “${title.slice(0, 60)}”`,
        text: `Hej ${buyer.name}\n\n“${title}” er sendt.${track}\n\nNår du har modtaget pakken, så tryk “Jeg har modtaget varen” – derefter har du 48 timer til at godkende eller melde et problem:\n${orderLink}${FOOTER}`,
        html: renderMail({
          preheader: `“${title}” er på vej til dig.`,
          heading: 'Din vare er på vej',
          paragraphs: [`Hej ${buyer.name}`, `“${title}” er sendt.`, 'Når du har modtaget pakken, så tryk “Jeg har modtaget varen”. Derefter har du 48 timer til at godkende varen eller melde et problem.'],
          ...(o.trackingNumber ? { details: { rows: [['Sporingsnummer', o.trackingNumber], ...(o.carrier ? [['Fragtfirma', o.carrier] as [string, string]] : [])] } } : {}),
          button: { label: 'Følg ordren', href: orderLink },
          reason: REASON
        }) });
      await db.update(orders).set({ shippedNotifiedAt: now }).where(eq(orders.id, o.id));
      out.sent++;
    } catch (e) { out.failed++; console.error('ordremail-fejl', e instanceof Error ? e.message : 'ukendt'); }
  }
  return out;
}
