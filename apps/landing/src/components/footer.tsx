import React from 'react';
import Link from 'next/link';
import { ArrowRight, Instagram, Youtube, Facebook } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { BrandLogo } from '@/components/brand-logo';

// Minimal outline SVG for WhatsApp matching Lucide line stroke
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#294237] bg-[#050807] pt-16 sm:pt-20 pb-4 sm:pb-6 relative overflow-hidden text-foreground">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Top 5-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-14">
          {/* Column 1 — Brand (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-4">
            <BrandLogo href="/" size="md" />

            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Create your squad, invite friends, organize turf matches and build your perfect lineup.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href="#overview"
                aria-label="Kalikkanundo on Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#294237] bg-surface text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#overview"
                aria-label="Kalikkanundo on YouTube"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#294237] bg-surface text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="#overview"
                aria-label="Kalikkanundo on Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#294237] bg-surface text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#overview"
                aria-label="Share Kalikkanundo on WhatsApp"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#294237] bg-surface text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
              >
                <WhatsAppIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Column 2 — Product (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Product
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#formations" className="text-muted-foreground hover:text-foreground transition-colors">
                  Formation Builder
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 — Platform (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href={`${siteConfig.appUrl}/login?returnUrl=/squads/new`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Create Squad
                </a>
              </li>
              <li>
                <a
                  href={`${siteConfig.appUrl}/join`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Join Squad
                </a>
              </li>
              <li>
                <a
                  href={`${siteConfig.appUrl}/profile`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Player Profile
                </a>
              </li>
              <li>
                <a
                  href={`${siteConfig.appUrl}/dashboard`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  My Dashboard
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 — Community & Support (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Community
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#why-kalikkanundo" className="text-muted-foreground hover:text-foreground transition-colors">
                  Why Kalikkanundo
                </a>
              </li>
              <li>
                <a href="#why-kalikkanundo" className="text-muted-foreground hover:text-foreground transition-colors">
                  Kerala Turf Guide
                </a>
              </li>
              <li>
                <a href="#overview" className="text-muted-foreground hover:text-foreground transition-colors">
                  Squad Rules
                </a>
              </li>
            </ul>
          </div>

          {/* Column 5 — Ready for Kickoff CTA (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold text-foreground">
              Ready for Kickoff?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bring your squad together and take your turf games to the next level.
            </p>
            <div className="pt-1">
              <a
                href={`${siteConfig.appUrl}/login?returnUrl=/squads/new`}
                className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Thin Horizontal Divider & Copyright */}
        <div className="border-t border-[#294237]/80 pt-6 pb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {currentYear} Kalikkanundo. All rights reserved.</p>
          <p className="text-[11px] font-mono text-muted-foreground/80">
            Built for Kerala Turf Football Community
          </p>
        </div>

        {/* Signature Oversized KALIKKANUNDO Typography */}
        <div className="relative w-full overflow-hidden flex items-center justify-center pt-4 select-none pointer-events-none">
          <span
            className="block text-center font-black uppercase tracking-tight"
            style={{
              fontSize: 'clamp(2.75rem, 11.2vw, 12rem)',
              lineHeight: 0.82,
              letterSpacing: '-0.04em',
              background: 'linear-gradient(to bottom, #E2E8F0 0%, #64748B 40%, #050807 98%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            KALIKKANUNDO
          </span>
        </div>
      </div>
    </footer>
  );
}
