import { Star } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import type { SkillLevel, PlayerSportInput, SportCatalogItem } from '../types';

const SKILLS: Array<{ key: SkillLevel; label: string; desc: string }> = [
  { key: 'beginner', label: 'Beginner', desc: 'Learning fundamentals' },
  { key: 'casual', label: 'Casual', desc: 'Weekend & friendly matches' },
  { key: 'intermediate', label: 'Intermediate', desc: 'Competitive & regular player' },
  { key: 'advanced', label: 'Advanced', desc: 'High intensity & league level' },
];

export function SportPlayStyle({
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
  const { toast } = useToast();

  const update = (item: PlayerSportInput) => {
    onChange(value.map((s) => (s.sport === item.sport ? item : s)));
  };

  return (
    <section aria-label="How you play" className="space-y-4">
      {value.map((item) => {
        const sport = catalog.find((s) => s.key === item.sport);
        if (!sport) return null;

        const maxRoles = sport.max_roles || 2;

        return (
          <div
            key={item.sport}
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-card space-y-5 transition-all"
          >
            {/* Sport Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none" role="img" aria-label={sport.name}>
                  {sport.emoji || '🎯'}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <span>{sport.name}</span>
                    {item.is_primary && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        <span>Primary</span>
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <span className="text-[11px] font-mono text-muted-foreground uppercase">
                {item.skill_level}
              </span>
            </div>

            {/* 1. Skill Level Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Skill Level
                </span>
                <span className="text-[11px] text-muted-foreground/80 italic">
                  How would you rate your level?
                </span>
              </div>

              <div role="group" aria-label={`${sport.name} skill level`} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SKILLS.map((skill) => {
                  const isSelected = item.skill_level === skill.key;
                  return (
                    <button
                      key={skill.key}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isSelected}
                      onClick={() => update({ ...item, skill_level: skill.key })}
                      className={`flex flex-col items-center justify-center min-h-[44px] px-3 py-2 rounded-xl border text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'border-border bg-surface-subtle text-foreground hover:border-primary/40 hover:bg-surface'
                      }`}
                    >
                      <span className="font-bold leading-tight">{skill.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Position / Role Selection Section */}
            {sport.roles.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {sport.role_label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Pick up to {maxRoles} • First is <span className="text-primary font-bold">Main</span>, second is <span className="text-primary/90 font-bold">2nd</span>
                  </span>
                </div>

                <div
                  role="group"
                  aria-label={`${sport.name} ${sport.role_label}`}
                  className="flex flex-wrap gap-2 sm:gap-2.5"
                >
                  {sport.roles.map((role) => {
                    const index = item.roles.indexOf(role.key);
                    const isSelected = index >= 0;

                    return (
                      <button
                        key={role.key}
                        type="button"
                        disabled={disabled}
                        aria-pressed={isSelected}
                        onClick={() => {
                          if (isSelected) {
                            // Remove role
                            update({
                              ...item,
                              roles: item.roles.filter((r) => r !== role.key),
                            });
                          } else if (item.roles.length < maxRoles) {
                            // Append role
                            update({
                              ...item,
                              roles: [...item.roles, role.key],
                            });
                          } else {
                            toast.warning(
                              'Position limit reached',
                              `You can select at most ${maxRoles} preferences for ${sport.name}. Tap a selected position to deselect it.`
                            );
                          }
                        }}
                        className={`group inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-foreground font-semibold shadow-sm ring-1 ring-primary/30'
                            : 'border-border bg-surface-subtle text-foreground/90 hover:border-primary/40 hover:bg-surface'
                        }`}
                      >
                        <span className="truncate">{role.label}</span>

                        {/* Distinct, Non-overlapping Position Rank Badges */}
                        {isSelected && (
                          <span
                            className={`inline-flex items-center justify-center text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-tight ${
                              index === 0
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : index === 1
                                ? 'bg-primary/20 text-primary border border-primary/40'
                                : 'bg-surface border border-border text-muted-foreground'
                            }`}
                          >
                            {index === 0 ? 'Main' : index === 1 ? '2nd' : `${index + 1}rd`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
