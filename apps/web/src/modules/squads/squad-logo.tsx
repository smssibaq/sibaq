import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { useSquadImage } from './use-squad-image';

const sizes = {
  xs: { box: 'h-5 w-5 rounded-md', icon: 'h-3 w-3' },
  sm: { box: 'h-9 w-9 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-12 w-12 rounded-xl', icon: 'h-6 w-6' },
  lg: { box: 'h-16 w-16 rounded-2xl', icon: 'h-8 w-8' },
} as const;

/** Rounded squad logo with the shield icon as default. Loads the image itself from the squad id. */
export function SquadLogo({ squadId, size = 'md', className }: { squadId: string; size?: keyof typeof sizes; className?: string }) {
  const { data: url } = useSquadImage(squadId);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const s = sizes[size];
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center overflow-hidden border border-primary/40 bg-primary/10 text-primary',
        s.box,
        className
      )}
    >
      {url && !failed ? (
        <img src={url} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <Shield className={s.icon} />
      )}
    </span>
  );
}
