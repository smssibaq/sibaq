import Link from 'next/link';
import Image from 'next/image';

export type BrandLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
  href?: string;
  onClick?: () => void;
  priority?: boolean;
};

const SIZE_CONFIGS = {
  sm: {
    iconSize: 32,
    iconClass: 'h-8 w-8',
    textClass: 'text-base font-extrabold',
    gapClass: 'gap-2',
  },
  md: {
    iconSize: 40,
    iconClass: 'h-10 w-10',
    textClass: 'text-lg font-extrabold',
    gapClass: 'gap-2.5',
  },
  lg: {
    iconSize: 64,
    iconClass: 'h-16 w-16',
    textClass: 'text-2xl font-black',
    gapClass: 'gap-3.5',
  },
};

export function BrandLogo({
  size = 'md',
  showName = true,
  className = '',
  href,
  onClick,
  priority = true,
}: BrandLogoProps) {
  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  const content = (
    <span className={`inline-flex items-center ${config.gapClass} ${className} group select-none`}>
      <span
        className={`relative ${config.iconClass} shrink-0 flex items-center justify-center transition-transform group-hover:scale-105`}
      >
        <Image
          src="/branding/kalikkanundo-logo.svg"
          alt="Kalikkanundo"
          width={config.iconSize}
          height={Math.round((config.iconSize * 241) / 221)}
          className="h-full w-full object-contain drop-shadow-sm"
          priority={priority}
        />
      </span>
      {showName && (
        <span className={`tracking-wide text-foreground font-sans ${config.textClass}`}>
          Kalikkan<span className="text-primary font-black">undo</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
        aria-label="Kalikkanundo Home"
      >
        {content}
      </Link>
    );
  }

  return content;
}
