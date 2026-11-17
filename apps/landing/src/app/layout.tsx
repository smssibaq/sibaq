import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import '@/styles/globals.css';
import { siteConfig } from '@/config/site';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/branding/kalikkanundo-logo.svg',
  },
  keywords: [
    'Kerala turf football',
    'football squad manager',
    'turf match organizer',
    '5v5 formations',
    '7v7 football lineup',
    'Kozhikode turf',
    'Kochi football',
  ],
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    type: 'website',
    locale: 'en_IN',
    siteName: 'Kalikkanundo',
    images: [
      {
        url: '/branding/kalikkanundo-logo.svg',
        width: 990,
        height: 1080,
        alt: 'Kalikkanundo Logo',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${poppins.variable}`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
