'use client';

import { CTASection } from '@/components/home/sections/cta-section';
import { FooterSection } from '@/components/home/sections/footer-section';
import { HeroSection } from '@/components/home/sections/hero-section';
import { OpenSourceSection } from '@/components/home/sections/open-source-section';
import { PricingSection } from '@/components/home/sections/pricing-section';
import { ModalProviders } from '@/providers/modal-providers';
import { BackgroundAALChecker } from '@/components/auth/background-aal-checker';
import { BentoSection } from '@/components/home/sections/bento-section';
import { CapabilitiesSection } from '@/components/home/sections/capabilities-section';
import { isLocalMode, isStagingMode } from '@/lib/config';
import { HeroSection as NewHeroSection } from '@/components/home/sections/new/hero-section';
import { AIWorkerSection } from '@/components/home/sections/new/ai-workers';
import { SlidesSection } from '@/components/home/sections/new/slides-section';
import { PersonalizationSection } from '@/components/home/sections/new/personalization-section';
import { FAQSection } from '@/components/home/sections/new/faq-section';
import { NewFooterSection } from '@/components/home/sections/new-footer-section';

export default function Home() {

  return (
    <>
      <ModalProviders />
      <BackgroundAALChecker>
        <main className="w-full">
          <NewHeroSection />
          <FAQSection />
          <PricingSection showInfo={false} />
          <NewFooterSection />
        </main>
      </BackgroundAALChecker>
    </>
  );
}
