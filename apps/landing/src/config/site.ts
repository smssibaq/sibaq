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
  tagline: 'Your Game. Your Squad.',
  description:
    'The football squad and match management platform built for Kerala turf players. Create permanent squads, organize matches, assign pitch positions, and build tactical lineups.',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173',
  navLinks: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Formation Builder', href: '#formations' },
    { label: 'Why Kalikkanundo', href: '#why-kalikkanundo' },
  ],
  features: [
    {
      title: 'Create Squads',
      description: 'Build a permanent football group with your friends, assign roles, and keep the roster ready.',
      icon: 'Shield',
    },
    {
      title: 'Invite Players',
      description: 'Invite teammates using instant shareable links and room codes directly via WhatsApp.',
      icon: 'UserPlus',
    },
    {
      title: 'Manage Matches',
      description: 'Plan friendly games, practice sessions, and upcoming fixtures at your favorite turf venues.',
      icon: 'Calendar',
    },
    {
      title: 'Build Formations',
      description: 'Create your starting lineup with a visual, responsive football pitch supporting 5v5 to 7v7.',
      icon: 'LayoutGrid',
    },
    {
      title: 'Track Availability',
      description: 'Know who is playing before match day with transparent playing, maybe, and out attendance.',
      icon: 'Users',
    },
    {
      title: 'Manage Your Team',
      description: 'Assign positions and organize Team A vs Team B effortlessly without confusion.',
      icon: 'Trophy',
    },
  ],
  footer: {
    copyright: `© ${new Date().getFullYear()} Kalikkanundo. Built for the Kerala turf football community.`,
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Formations', href: '#formations' },
      { label: 'Why Kalikkanundo', href: '#why-kalikkanundo' },
    ],
  },
};
