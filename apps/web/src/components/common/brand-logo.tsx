export type BrandLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
  href?: string;
  onClick?: () => void;
};

const SIZE_CONFIGS = {
  sm: {
    iconClass: 'h-8 w-8',
    textClass: 'text-sm font-extrabold',
    gapClass: 'gap-2',
  },
  md: {
    iconClass: 'h-9 w-9',
    textClass: 'text-base font-extrabold',
    gapClass: 'gap-2.5',
  },
  lg: {
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
}: BrandLogoProps) {
  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  const content = (
    <span className={`inline-flex items-center ${config.gapClass} ${className} group select-none`}>
      <span
        className={`relative ${config.iconClass} shrink-0 flex items-center justify-center transition-transform group-hover:scale-105`}
      >
        <img
          src="/branding/kalikkanundo-logo.svg"
          alt="Kalikkanundo"
          className="h-full w-full object-contain drop-shadow-sm"
          loading="eager"
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
      <a
        href={href}
        onClick={onClick}
        className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
        aria-label="Kalikkanundo Home"
      >
        {content}
      </a>
    );
  }

  return content;
}
