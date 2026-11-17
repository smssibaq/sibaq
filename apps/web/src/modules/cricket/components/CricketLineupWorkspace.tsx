import { useCallback, useEffect, useState } from 'react';
import { ListOrdered, Compass, Activity, Users2 } from 'lucide-react';
import { Card } from '@/components/ui';
import type { CricketDraftAction, CricketGameDetail } from '../types';
import { CricketBattingOrder } from './CricketBattingOrder';
import { CricketBowlingPlan } from './CricketBowlingPlan';
import { CricketFieldPositions } from './CricketFieldPositions';
import { CricketVisualLineup } from './CricketVisualLineup';
import { CricketSubstituteBench } from './CricketSubstituteBench';

export type LineupSection = 'fielding' | 'batting' | 'bowling' | 'bench' | 'visual';

export function CricketLineupWorkspace({ game, onDraftChange }: { game: CricketGameDetail; onDraftChange?: (action: CricketDraftAction | null) => void }) {
  const [activeSection, setActiveSection] = useState<LineupSection>('fielding');
  const [fieldAction, setFieldAction] = useState<CricketDraftAction | null>(null);
  const [battingAction, setBattingAction] = useState<CricketDraftAction | null>(null);
  const saveAll = useCallback(() => {
    if (fieldAction?.dirty) fieldAction.save();
    if (battingAction?.dirty) battingAction.save();
  }, [fieldAction, battingAction]);
  useEffect(() => {
    onDraftChange?.({ dirty: Boolean(fieldAction?.dirty || battingAction?.dirty), pending: Boolean(fieldAction?.pending || battingAction?.pending), save: saveAll });
    return () => onDraftChange?.(null);
  }, [onDraftChange, fieldAction, battingAction, saveAll]);

  const SECTIONS: { key: LineupSection; label: string; icon: typeof Compass }[] = [
    { key: 'visual', label: 'Visual lineup', icon: Compass },
    { key: 'fielding', label: 'Fielding Ground', icon: Compass },
    { key: 'batting', label: 'Batting Order', icon: ListOrdered },
    { key: 'bowling', label: 'Bowling Plan', icon: Activity },
    { key: 'bench', label: 'Bench & Squad', icon: Users2 },
  ];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-base font-bold text-foreground">Tactical Lineup & Match Strategy</h2>
          <p className="text-xs text-muted-foreground">
            Configure batting order, bowling quotas, and fielding field placements
          </p>
        </div>
      </div>

      {/* Segmented Top Control Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-surface-subtle border border-border">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
            className={`flex items-center justify-center gap-1.5 min-h-11 rounded-lg text-xs font-bold transition-all ${
              activeSection === key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="pt-2">
        {activeSection === 'visual' && <CricketVisualLineup key={game.game_id} game={game} />}
        <div hidden={activeSection !== 'fielding'}><CricketFieldPositions game={game} onDraftChange={setFieldAction} /></div>
        <div hidden={activeSection !== 'batting'}><CricketBattingOrder game={game} onDraftChange={setBattingAction} /></div>
        <div hidden={activeSection !== 'bowling'}><CricketBowlingPlan key={game.game_id} game={game} /></div>
        {activeSection === 'bench' && <CricketSubstituteBench game={game} />}
      </div>
    </Card>
  );
}

