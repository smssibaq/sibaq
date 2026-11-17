import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { Features } from '@/components/features';
import { FormationShowcase } from '@/components/formation-showcase';
import { HowItWorks } from '@/components/how-it-works';
import { MatchShowcase } from '@/components/match-showcase';
import { KeralaTurf } from '@/components/kerala-turf';
import { CtaSection } from '@/components/cta-section';
import { Footer } from '@/components/footer';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <FormationShowcase />
        <HowItWorks />
        <MatchShowcase />
        <KeralaTurf />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

