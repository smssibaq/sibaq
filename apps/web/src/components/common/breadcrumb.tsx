import { ChevronRight } from 'lucide-react';

export interface BreadcrumbProps {
  section: string;
  title: string;
  className?: string;
}

/**
 * Responsive breadcrumb navigation:
 * Hidden on mobile screens (< 768px / md), visible on tablet and desktop (>= 768px).
 */
export function Breadcrumbs({ section, title, className = '' }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`hidden md:flex items-center gap-1.5 truncate text-xs ${className}`}
    >
      <span className="font-semibold text-muted-foreground shrink-0">
        {section}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
      <h1 className="text-sm sm:text-base font-extrabold text-foreground truncate">
        {title}
      </h1>
    </nav>
  );
}

export const Breadcrumb = Breadcrumbs;
