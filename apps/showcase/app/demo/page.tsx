import { Button, CategoryTile, HScroll, Hero, IconButton, Screen, ScreenContent, SearchBar, Section, SectionHeader, TopBar } from '@respin/ui';
import { DemoTabBar } from '../../components/DemoTabBar';
import { HomeFeed } from '../../components/HomeFeed';
import { categories } from '../../lib/data';

export default function DemoHome() {
  return (
    <Screen>
      <TopBar left={<IconButton icon="heart" label="Favoritter" href="/demo" />} right={<IconButton icon="bell" label="Notifikationer" href="/demo/messages" dot />}>
        <SearchBar href="/demo" />
      </TopBar>
      <ScreenContent withTabBar>
        <Hero title="Giv tøjet nyt liv. Sælg nemt, køb unikt.">
          <Button variant="dark" size="sm" href="/demo/sell">Sælg nu</Button>
        </Hero>
        <Section><SectionHeader title="Kategorier" /></Section>
        <HScroll>{categories.map((c) => <CategoryTile key={c.label} icon={c.icon} label={c.label} href="/demo" />)}</HScroll>
        <Section><SectionHeader title="Anbefalet til dig" /></Section>
        <HomeFeed />
      </ScreenContent>
      <DemoTabBar />
    </Screen>
  );
}
