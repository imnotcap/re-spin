import { Hero } from '../components/sections/Hero';
import { Stats } from '../components/sections/Stats';
import { HowItWorks } from '../components/sections/HowItWorks';
import { Features } from '../components/sections/Features';
import { DemoSection } from '../components/sections/DemoSection';
import { FeesTeaser } from '../components/sections/FeesTeaser';
import { Faq } from '../components/sections/Faq';
import { Cta } from '../components/sections/Cta';

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <DemoSection />
      <FeesTeaser />
      <Faq />
      <Cta />
    </>
  );
}
