import React from 'react';
import { ProfilePhotoContext } from '@/lib/images/profile-photo-context';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  userId?: string;
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

export function Avatar({ src, userId, alt = 'Avatar', fallback = 'P', size = 'md', className, ...props }: AvatarProps) {
  const photo = React.useContext(ProfilePhotoContext);
  const imageSrc = userId && photo?.userId === userId ? photo.url ?? src : src;
  const initials = fallback.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase() || 'P';
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [imageSrc]);

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
      {imageSrc && !imageError ? (
        <img
          src={imageSrc}
          alt={alt}
          draggable={false}
          decoding="async"
          onError={() => setImageError(true)}
          className="pointer-events-none h-full w-full object-cover object-center"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export const AppAvatar = Avatar;
