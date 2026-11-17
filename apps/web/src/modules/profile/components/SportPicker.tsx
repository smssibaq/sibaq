import type { MouseEvent } from 'react';
import { Star, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PlayerSportInput, SportCatalogItem } from '../types';

export function SportPicker({
  catalog,
  value,
  onChange,
  disabled,
}: {
  catalog: SportCatalogItem[];
  value: PlayerSportInput[];
  onChange: (sports: PlayerSportInput[]) => void;
  disabled?: boolean;
}) {
  function toggle(sport: SportCatalogItem) {
    if (disabled) return;
    const exists = value.some((s) => s.sport === sport.key);
    const next = exists
      ? value.filter((s) => s.sport !== sport.key)
      : [
          ...value,
          {
            sport: sport.key,
            skill_level: 'casual' as const,
            roles: [],
            is_primary: value.length === 0,
          },
        ];
    if (next.length && !next.some((s) => s.is_primary)) {
      next[0] = { ...next[0], is_primary: true };
    }
    onChange(next);
  }

  function setPrimary(sportKey: string, e: MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    const selected = value.find((s) => s.sport === sportKey);
    const next = selected
      ? value
      : [
          ...value,
          {
            sport: sportKey,
            skill_level: 'casual' as const,
            roles: [],
            is_primary: false,
          },
        ];
    onChange(next.map((s) => ({ ...s, is_primary: s.sport === sportKey })));
  }

  return (
    <section className="space-y-3" aria-label="Choose your sports">
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
        Select the sports you play. Tap the star to choose your primary sport.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
        {catalog.map((sport) => {
          const selected = value.find((s) => s.sport === sport.key);
          const isSelected = Boolean(selected);
          const isPrimary = Boolean(selected?.is_primary);

          return (
            <div
              key={sport.key}
              onClick={() => toggle(sport)}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  toggle(sport);
                }
              }}
              className={`group relative flex h-full min-h-[82px] cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                disabled ? 'opacity-50 pointer-events-none' : ''
              } ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                  : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-subtle/80'
              }`}
            >
              {/* Left: Sport Icon + Name & Status */}
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                {/* Emoji / Icon Container */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    isSelected
                      ? 'border-primary/30 bg-primary/15 text-foreground'
                      : 'border-border bg-surface-subtle text-muted-foreground group-hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl" role="img" aria-label={sport.name}>
                    {sport.emoji || '🎯'}
                  </span>
                </div>

                {/* Sport Label & Meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {sport.name}
                    </span>
                    {!sport.is_enabled && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                        Soon
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    {isPrimary ? (
                      <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        <span>Primary sport</span>
                      </span>
                    ) : isSelected ? (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Selected
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/70">
                        Tap to add
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Checkbox and Primary Star Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                {/* Primary Star Action Button */}
                <button
                  type="button"
                  aria-label={`Make ${sport.name} your primary sport`}
                  aria-pressed={isPrimary}
                  disabled={disabled}
                  onClick={(e) => setPrimary(sport.key, e)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isPrimary
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground/40 hover:text-primary hover:bg-surface-subtle'
                  }`}
                  title={isPrimary ? 'Primary sport' : 'Set as primary sport'}
                >
                  <Star
                    className="h-4 w-4"
                    fill={isPrimary ? 'currentColor' : 'none'}
                  />
                </button>

                {/* Selection Checkmark Indicator */}
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/80 bg-surface-subtle text-transparent group-hover:border-primary/50'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
