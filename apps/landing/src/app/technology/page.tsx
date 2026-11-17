import { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { TechHero } from '@/components/technology/tech-hero';
import { ArchitectureDiagram } from '@/components/technology/architecture-diagram';
import { TechStackGrid } from '@/components/technology/tech-stack-grid';
import { EngineeringPatterns } from '@/components/technology/engineering-patterns';
import { SecurityArchitecture } from '@/components/technology/security-architecture';
import { ProductLifecycle } from '@/components/technology/product-lifecycle';

export const metadata: Metadata = {
  title: 'Technology & Architecture | Kalikkanundo Engineering',
  description:
    'In-depth engineering showcase of the Kalikkanundo multi-sport platform: system topology, PostgreSQL Row-Level Security (RLS), Realtime WebSocket synchronization, and strict state invariants.',
};

export default function TechnologyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <TechHero />
        <ArchitectureDiagram />
        <TechStackGrid />
        <EngineeringPatterns />
        <SecurityArchitecture />
        <ProductLifecycle />
      </main>
      <Footer />
    </div>
  );
}

