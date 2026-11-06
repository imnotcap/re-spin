import { notFound } from 'next/navigation';
import { Avatar, Button, CertifiedBadge, Chip, Notice, ProductImage, Rating, Screen, ScreenContent, ScreenFooter, Text, TopBar } from '@respin/ui';
import { buyerFee, formatKr } from '@respin/ui/utils';
import { OfferButton } from '../../../../components/OfferSheet';
import { items, sellers } from '../../../../lib/data';

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = items.find((i) => String(i.id) === id);
  if (!item) notFound();
  const seller = sellers[item.sellerId]!;
  return (
    <Screen bleed>
      <TopBar floating backHref="/demo" />
      <ScreenContent withFooter>
        <ProductImage alt={item.title} ratio="wide" shade={Number(item.id)} />
        <div className="rs-px" style={{ padding: '16px 16px 0' }}>
          <div className="rs-row-flex rs-gap-3" style={{ padding: 12, borderRadius: 14, background: 'var(--rs-surface)', boxShadow: 'var(--rs-shadow-2)', marginTop: -48, position: 'relative' }}>
            <Avatar name={seller.name} />
            <div className="rs-grow">
              <div className="rs-row-flex rs-gap-2"><b>{seller.name}</b>{seller.certified && <CertifiedBadge />}</div>
              <Rating value={seller.rating} count={`${seller.reviews} vurderinger`} />
            </div>
          </div>
          <Text variant="h1" style={{ marginTop: 20 }}>{item.title}</Text>
          <Text variant="h1" className="rs-t-price" as="p">{formatKr(item.price)}</Text>
          <Text variant="small" muted>{formatKr(item.price + buyerFee(item.price))} inkl. køberbeskyttelse</Text>
          <div className="rs-row-flex rs-gap-2" style={{ flexWrap: 'wrap', margin: '16px 0' }}>
            <Chip tag>{item.brand}</Chip><Chip tag>{item.size}</Chip><Chip tag>{item.condition}</Chip>
          </div>
          <Text>{item.description}</Text>
          <div style={{ margin: '16px 0 24px' }}><Notice><b>Køberbeskyttelse inkluderet.</b> Vi holder pengene, til du har modtaget varen.</Notice></div>
        </div>
      </ScreenContent>
      <ScreenFooter>
        <OfferButton item={item} />
        <Button variant="buy" size="lg" href="/demo" style={{ flex: 1.4 }}>Køb nu</Button>
      </ScreenFooter>
    </Screen>
  );
}
