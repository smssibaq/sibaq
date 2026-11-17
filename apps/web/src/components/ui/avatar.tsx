import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
};

export function Avatar({ src, alt = 'Avatar', fallback = 'P', size = 'md', className, ...props }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  return (
    <div
      className={twMerge(
        clsx(
          'relative inline-flex shrink-0 items-center justify-center rounded-full bg-surface-subtle font-bold text-primary border border-border overflow-hidden select-none',
          sizeClasses[size],
          className
        )
      )}
      {...props}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{fallback.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

export const AppAvatar = Avatar;
