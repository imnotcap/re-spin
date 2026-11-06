import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Avatar, Badge, BalanceCard, Button, CertifiedBadge, ConversationRow, EmptyState, Icon, IconButton, List, ListRow, Notice,
  PriceSummary, ProductCard, ProductGrid, Progress, Rating, Skeleton, Stepper, Text, Timeline, Wordmark
} from '@respin/ui';
import { colors, gradients } from '@respin/ui/tokens';
import { ICON_NAMES, buyerFee, formatKr, formatKrDecimals, sellerFee } from '@respin/ui/utils';
import { GalleryInteractive } from '../components/GalleryInteractive';
import { TailwindDemo } from '../components/TailwindDemo';
import { items } from '../lib/data';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section style={{ marginTop: 48 }}>
    <h2 style={{ fontSize: 22, fontWeight: 800, borderBottom: '2px solid var(--rs-slate)', paddingBottom: 8, margin: '0 0 20px' }}>{title}</h2>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>{children}</div>
  </section>
);

export default function Gallery() {
  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 20px 96px' }}>
      <style>{`.g-col{width:358px;max-width:100%;display:flex;flex-direction:column;gap:12px;position:relative;padding:12px;border-radius:14px;background:var(--rs-bg);border:1px solid var(--rs-border)}`}</style>
      <Wordmark size={36} color="var(--rs-forest)" onLight />
      <Text variant="display" style={{ marginTop: 16 }}>@respin/ui</Text>
      <Text muted style={{ marginTop: 8, maxWidth: 560 }}>UI-kit til re:spin: React + TypeScript, App Router-klar. Denne side er en server component, der blander statiske og interaktive komponenter.</Text>
      <div style={{ marginTop: 16 }}><Button href="/demo" iconRight="arrow">Åbn app-demo</Button></div>

      <Section title="Tokens (fra @respin/ui/tokens, på serveren)">
        {Object.entries(colors).map(([name, hex]) => (
          <div key={name} style={{ width: 96 }}>
            <div style={{ height: 48, borderRadius: 10, background: hex, border: '1px solid var(--rs-border)' }} />
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{name}</div><div className="rs-t-caption rs-t-muted">{hex}</div>
          </div>
        ))}
        {Object.entries(gradients).map(([name, g]) => (
          <div key={name} style={{ width: 96 }}><div style={{ height: 48, borderRadius: 10, background: g }} /><div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{name}</div></div>
        ))}
      </Section>

      <Section title="Forretningsregler (fra @respin/ui/utils)">
        <div className="g-col">
          <PriceSummary rows={[['Vare', formatKr(450)], ['Køberbeskyttelse (5 % + 3 kr.)', formatKr(buyerFee(450))], ['Forsendelse', formatKr(39)]]} total={['I alt', formatKr(450 + buyerFee(450) + 39)]} />
          <Notice icon="wallet">Sælger betaler 1 % ({formatKrDecimals(sellerFee(450))}). Certificeret: 0,5 % ({formatKrDecimals(sellerFee(450, true))}).</Notice>
        </div>
      </Section>

      <Section title="Typografi">
        <div className="g-col">
          <Text variant="display">Display 32</Text><Text variant="h1">H1 26</Text><Text variant="h2">H2 20</Text><Text variant="h3">H3 17</Text>
          <Text>Brødtekst 15/22</Text><Text variant="small" muted>Small 13 – hjælpetekst</Text><Text variant="caption" muted>Caption 12</Text>
        </div>
      </Section>

      <Section title="Knapper">
        <Button>Sæt til salg</Button><Button variant="buy">Køb nu</Button><Button variant="outline">Byd</Button><Button variant="dark">Dark</Button>
        <Button variant="forest" icon="plus">Forest</Button><Button variant="ghost">Ghost</Button><Button disabled>Deaktiveret</Button><Button size="sm">Lille</Button>
        <Button size="lg" full>Stor – fuld bredde</Button>
        <IconButton icon="heart" label="Favorit" variant="soft" /><IconButton icon="bell" label="Notifikationer" dot />
      </Section>

      <Section title="Badges, avatar, rating">
        <Badge>Næsten ny</Badge><Badge tone="lime">Lime</Badge><Badge tone="coral" live>Live</Badge><Badge tone="soft" icon="check">Verificeret</Badge><Badge tone="warn">Skal sendes</Badge><CertifiedBadge />
        <Avatar name="Mette" online /><Avatar name="Jonas" size="lg" /><Rating value={4.9} count={120} />
      </Section>

      <Section title="Produktkort">
        <div className="g-col"><ProductGrid style={{ padding: 0 }}>{items.slice(0, 2).map((it) => <ProductCard key={it.id} product={it} href={`/demo/item/${it.id}`} badge={it.condition} />)}</ProductGrid></div>
      </Section>

      <Section title="Formularer, faner, sheet, toast">
        <GalleryInteractive />
      </Section>

      <Section title="Lister og feedback">
        <div className="g-col">
          <List style={{ margin: 0 }}>
            <ListRow icon="wallet" title="Saldo" description="1.240 kr." href="/demo" />
            <ListRow icon="logout" title="Log ud" danger chevron={false} href="/demo" />
          </List>
          <ConversationRow name="Mette K." preview="Hej! Er den stadig til salg?" time="9:41" itemTitle="Vintage ruskindstaske" unread online href="/demo/messages/1" />
          <Notice>Køberbeskyttelse inkluderet.</Notice>
          <Progress value={60} aria-label="Fremdrift" />
          <Stepper step={2} total={3} />
          <Timeline steps={[{ title: 'Betalt', description: 'I dag', state: 'done' }, { title: 'Afsendt', state: 'now' }, { title: 'Leveret' }]} />
          <BalanceCard amount={1240}><Button variant="outline" icon="bank">Udbetal til bank</Button></BalanceCard>
          <EmptyState icon="heart" title="Ingen favoritter" description="Tryk på hjertet for at gemme." />
          <Skeleton style={{ height: 64 }} />
        </div>
      </Section>

      <Section title="Tailwind-preset">
        <TailwindDemo />
      </Section>

      <Section title={`Ikoner (${ICON_NAMES.length})`}>
        {ICON_NAMES.map((n) => <div key={n} style={{ width: 64, textAlign: 'center' }}><Icon name={n} size={28} /><div className="rs-t-caption rs-t-muted">{n}</div></div>)}
      </Section>
      <p style={{ marginTop: 48 }}><Link href="/demo" className="rs-t-link">Åbn app-demo →</Link></p>
    </main>
  );
}
