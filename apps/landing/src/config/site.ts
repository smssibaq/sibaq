export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  appUrl: string;
  navLinks: Array<{ label: string; href: string }>;
  features: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  footer: {
    copyright: string;
    links: Array<{ label: string; href: string }>;
  };
}

export const siteConfig: SiteConfig = {
  name: 'Kalikkanundo',
  tagline: 'Your Game. Your Squad. Every Sport.',
  description:
    'The multi-sport squad and match management platform built for Kerala players. Create permanent squads, organize matches, manage lineups, and track attendance across Football, Cricket, Badminton, and Volleyball.',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173',
  navLinks: [
    { label: 'Sports', href: '#sports' },
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Tactics & Lineups', href: '#formations' },
    { label: 'Why Kalikkanundo', href: '#why-kalikkanundo' },
  ],
  features: [
    {
      title: 'Create Squads',
      description: 'Build permanent sports groups for football, cricket, badminton, and volleyball with your friends.',
      icon: 'Shield',
    },
    {
      title: 'Invite Players',
      description: 'Invite teammates using instant shareable links and room codes directly via WhatsApp.',
      icon: 'UserPlus',
    },
    {
      title: 'Manage Matches',
      description: 'Schedule fixtures, turf sessions, net practices, and court games at your favorite local venues.',
      icon: 'Calendar',
    },
    {
      title: 'Sport-Specific Lineups',
      description: 'From football 5v5/7v7 pitch formations to cricket batting orders and fielding positions.',
      icon: 'LayoutGrid',
    },
    {
      title: 'Track Availability',
      description: 'Know who is playing before match day with transparent playing, maybe, and out RSVPs.',
      icon: 'Users',
    },
    {
      title: 'Balanced Teams & Derbies',
      description: 'Assign positions, split into Team A vs Team B, and organize competitive games without confusion.',
      icon: 'Trophy',
    },
  ],
  footer: {
    copyright: `© ${new Date().getFullYear()} Kalikkanundo. Built for Kerala sports communities.`,
    links: [
      { label: 'Sports', href: '#sports' },
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Lineups & Formations', href: '#formations' },
      { label: 'Why Kalikkanundo', href: '#why-kalikkanundo' },
      { label: 'Technology & Architecture', href: '/technology' },
    ],
  },
};
