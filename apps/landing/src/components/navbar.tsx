'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { BrandLogo } from '@/components/brand-logo';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-container items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <BrandLogo href="/" size="md" />

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
          {siteConfig.navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: Desktop CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href={`${siteConfig.appUrl}/login`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface-subtle px-4 text-sm font-semibold text-foreground hover:bg-surface hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Sign In
          </a>
          <a
            href={`${siteConfig.appUrl}/login?returnUrl=/squads/new`}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-surface px-4 py-5 md:hidden shadow-dropdown">
          <nav className="flex flex-col gap-2">
            {siteConfig.navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <a
                href={`${siteConfig.appUrl}/login`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-full items-center justify-center rounded-lg border border-border bg-surface-subtle text-sm font-semibold text-foreground hover:bg-surface"
              >
                Sign In
              </a>
              <a
                href={`${siteConfig.appUrl}/login?returnUrl=/squads/new`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-center text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
