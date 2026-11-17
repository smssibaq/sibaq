import { useState, useMemo } from 'react';
import { Shield, Sparkles, X, UserCheck, Save } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import type { CricketGameDetail, CricketSide } from '../types';
import { useSetFieldPositions } from '../api';

export interface FieldPositionDef {
  name: string;
  category: 'central' | 'off' | 'leg';
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
}

export const STANDARD_FIELD_POSITIONS: FieldPositionDef[] = [
  // Central
  { name: 'Wicketkeeper', category: 'central', x: 0.5, y: 0.76 },
  { name: 'Bowler', category: 'central', x: 0.5, y: 0.24 },
  { name: 'Short Leg', category: 'central', x: 0.42, y: 0.68 },
  { name: 'Short Midwicket', category: 'central', x: 0.38, y: 0.55 },

  // Off Side
  { name: 'Slip', category: 'off', x: 0.58, y: 0.78 },
  { name: 'Second Slip', category: 'off', x: 0.63, y: 0.75 },
  { name: 'Third Slip', category: 'off', x: 0.68, y: 0.72 },
  { name: 'Gully', category: 'off', x: 0.73, y: 0.67 },
  { name: 'Point', category: 'off', x: 0.8, y: 0.5 },
  { name: 'Backward Point', category: 'off', x: 0.78, y: 0.6 },
  { name: 'Cover', category: 'off', x: 0.75, y: 0.38 },
  { name: 'Extra Cover', category: 'off', x: 0.68, y: 0.28 },
  { name: 'Mid Off', category: 'off', x: 0.58, y: 0.28 },
  { name: 'Long Off', category: 'off', x: 0.64, y: 0.12 },

  // Leg Side
  { name: 'Square Leg', category: 'leg', x: 0.2, y: 0.5 },
  { name: 'Deep Square Leg', category: 'leg', x: 0.12, y: 0.55 },
  { name: 'Fine Leg', category: 'leg', x: 0.38, y: 0.84 },
  { name: 'Deep Fine Leg', category: 'leg', x: 0.3, y: 0.92 },
  { name: 'Midwicket', category: 'leg', x: 0.26, y: 0.38 },
  { name: 'Deep Midwicket', category: 'leg', x: 0.16, y: 0.3 },
  { name: 'Mid On', category: 'leg', x: 0.42, y: 0.28 },
  { name: 'Long On', category: 'leg', x: 0.36, y: 0.12 },
];

export interface AssignedFieldPlayer {
  playerId: string;
  positionName: string;
  x: number;
  y: number;
  isCustom?: boolean;
}

export function CricketFieldPositions({ game }: { game: CricketGameDetail }) {
  const { toast } = useToast();
  const setFieldPositions = useSetFieldPositions(game.game_id);
  const [activeSide, setActiveSide] = useState<CricketSide>('A');

  // Confirmed fielding team players
  const fieldingTeam = useMemo(
    () => game.players.filter((p) => p.attendance_status === 'playing' && p.team_side === activeSide),
    [game.players, activeSide]
  );

  // Initial field positions state from team players
  const [assignments, setAssignments] = useState<AssignedFieldPlayer[]>(() => {
    // Generate default assignments for available team players
    const autoAssigned: AssignedFieldPlayer[] = [];
    const positionsList = ['Wicketkeeper', 'Bowler', 'Mid Off', 'Mid On', 'Cover', 'Midwicket', 'Point', 'Square Leg', 'Slip', 'Long Off', 'Long On'];

    fieldingTeam.forEach((player, idx) => {
      const posName = positionsList[idx % positionsList.length];
      const standard = STANDARD_FIELD_POSITIONS.find((p) => p.name === posName) ?? STANDARD_FIELD_POSITIONS[0];
      autoAssigned.push({
        playerId: player.user_id,
        positionName: standard.name,
        x: standard.x,
        y: standard.y,
      });
    });

    return autoAssigned;
  });

  // Selected player marker or position for assignment
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const closed = game.status === 'completed' || game.status === 'cancelled';
  const canEdit = game.is_organizer && !closed;

  // Unassigned fielders
  const unassignedPlayers = fieldingTeam.filter(
    (p) => !assignments.some((a) => a.playerId === p.user_id)
  );

  // Field Presets
  const applyPreset = (presetName: 'attacking' | 'defensive' | 'balanced') => {
    if (!canEdit) return;

    let targetPositions: string[] = [];
    if (presetName === 'attacking') {
      targetPositions = [
        'Wicketkeeper',
        'Bowler',
        'Slip',
        'Second Slip',
        'Gully',
        'Short Leg',
        'Point',
        'Cover',
        'Mid Off',
        'Mid On',
        'Midwicket',
      ];
    } else if (presetName === 'defensive') {
      targetPositions = [
        'Wicketkeeper',
        'Bowler',
        'Long Off',
        'Long On',
        'Deep Midwicket',
        'Deep Square Leg',
        'Deep Fine Leg',
        'Cover',
        'Point',
        'Mid Off',
        'Mid On',
      ];
    } else {
      targetPositions = [
        'Wicketkeeper',
        'Bowler',
        'Slip',
        'Point',
        'Cover',
        'Mid Off',
        'Mid On',
        'Midwicket',
        'Square Leg',
        'Fine Leg',
        'Long Off',
      ];
    }

    const newAssignments: AssignedFieldPlayer[] = [];
    fieldingTeam.forEach((player, idx) => {
      const posName = targetPositions[idx % targetPositions.length];
      const standard = STANDARD_FIELD_POSITIONS.find((p) => p.name === posName) ?? STANDARD_FIELD_POSITIONS[0];
      newAssignments.push({
        playerId: player.user_id,
        positionName: standard.name,
        x: standard.x,
        y: standard.y,
      });
    });

    setAssignments(newAssignments);
    toast.success('Field Preset Applied', `${presetName.toUpperCase()} field setup loaded.`);
  };

  const handlePositionClick = (pos: FieldPositionDef) => {
    if (!canEdit) return;

    if (selectedPlayerId) {
      // Assign selected player to this position
      setAssignments((prev) => {
        const withoutPlayer = prev.filter((a) => a.playerId !== selectedPlayerId);
        // Also remove if another player was on this position
        const withoutPosition = withoutPlayer.filter((a) => a.positionName !== pos.name);
        return [
          ...withoutPosition,
          {
            playerId: selectedPlayerId,
            positionName: pos.name,
            x: pos.x,
            y: pos.y,
          },
        ];
      });
      setSelectedPlayerId(null);
    }
  };

  const removeAssignment = (playerId: string) => {
    if (!canEdit) return;
    setAssignments((prev) => prev.filter((a) => a.playerId !== playerId));
    if (selectedPlayerId === playerId) setSelectedPlayerId(null);
  };

  const handleSave = () => {
    const payload = assignments.map((a) => ({
      player_id: a.playerId,
      position_name: a.positionName,
      x_pos: a.x,
      y_pos: a.y,
      is_custom: Boolean(a.isCustom),
    }));

    setFieldPositions.mutate(
      { side: activeSide, positions: payload },
      {
        onSuccess: () => {
          toast.success('Field Positions Saved', `Team ${activeSide} fielding layout saved to database.`);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header and Side Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-primary" /> Tactical Cricket Ground
          </h3>
          <p className="text-xs text-muted-foreground">
            Top-down oval field setup with 30-yard boundary & positions
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-subtle p-1 rounded-lg border border-border self-start">
          <button
            type="button"
            onClick={() => setActiveSide('A')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeSide === 'A'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Team A Field
          </button>
          <button
            type="button"
            onClick={() => setActiveSide('B')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeSide === 'B'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Team B Field
          </button>
        </div>
      </div>

      {/* Field Presets Toolbar */}
      {canEdit && (
        <div className="flex items-center justify-between flex-wrap gap-2 p-2 rounded-xl bg-surface-subtle border border-border text-xs">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">Tactical Presets:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-semibold px-2.5"
              onClick={() => applyPreset('attacking')}
            >
              Attacking
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-semibold px-2.5"
              onClick={() => applyPreset('balanced')}
            >
              Balanced
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-semibold px-2.5"
              onClick={() => applyPreset('defensive')}
            >
              Defensive
            </Button>
          </div>
        </div>
      )}

      {/* SVG Interactive Ground */}
      <div className="relative mx-auto w-full max-w-[420px] aspect-square rounded-3xl border-2 border-[#294237] bg-[#0B1F19] p-2 shadow-2xl overflow-hidden select-none">
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Ground Turf Background */}
          <rect width="400" height="400" fill="#0B1F19" />

          {/* Grass concentric mowing stripes effect */}
          <circle cx="200" cy="200" r="185" fill="#0E241E" />
          <circle cx="200" cy="200" r="150" fill="#0B1F19" />
          <circle cx="200" cy="200" r="120" fill="#0E241E" />

          {/* Oval Boundary Rope */}
          <ellipse
            cx="200"
            cy="200"
            rx="188"
            ry="178"
            fill="none"
            stroke="#294237"
            strokeWidth="3"
            strokeDasharray="6 3"
          />

          {/* 30-Yard Inner Circle (Field Restriction) */}
          <ellipse
            cx="200"
            cy="200"
            rx="105"
            ry="95"
            fill="none"
            stroke="#B7F34B"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.5"
          />

          {/* Central 22-Yard Pitch */}
          <rect
            x="184"
            y="125"
            width="32"
            height="150"
            rx="2"
            fill="#142D25"
            stroke="#294237"
            strokeWidth="1.5"
          />

          {/* Pitch Creases */}
          {/* Bowling Crease (Top / North) */}
          <line x1="178" y1="140" x2="222" y2="140" stroke="#A2B5AA" strokeWidth="1.5" />
          {/* Batting Crease (Popping Crease) */}
          <line x1="178" y1="148" x2="222" y2="148" stroke="#F5F7F4" strokeWidth="2" />

          {/* Bowling Crease (Bottom / South) */}
          <line x1="178" y1="260" x2="222" y2="260" stroke="#A2B5AA" strokeWidth="1.5" />
          {/* Batting Crease (Popping Crease) */}
          <line x1="178" y1="252" x2="222" y2="252" stroke="#F5F7F4" strokeWidth="2" />

          {/* Stumps / Wickets */}
          <circle cx="196" cy="140" r="1.5" fill="#B7F34B" />
          <circle cx="200" cy="140" r="1.5" fill="#B7F34B" />
          <circle cx="204" cy="140" r="1.5" fill="#B7F34B" />

          <circle cx="196" cy="260" r="1.5" fill="#B7F34B" />
          <circle cx="200" cy="260" r="1.5" fill="#B7F34B" />
          <circle cx="204" cy="260" r="1.5" fill="#B7F34B" />

          {/* Off / Leg Side Annotations */}
          <text x="360" y="204" fill="#A2B5AA" fontSize="10" opacity="0.6" textAnchor="end" fontWeight="bold">
            OFF
          </text>
          <text x="40" y="204" fill="#A2B5AA" fontSize="10" opacity="0.6" textAnchor="start" fontWeight="bold">
            LEG
          </text>

          {/* Standard Target Position Anchors (Clickable Ghost Targets) */}
          {canEdit &&
            selectedPlayerId &&
            STANDARD_FIELD_POSITIONS.map((pos) => {
              const cx = pos.x * 400;
              const cy = pos.y * 400;
              return (
                <g
                  key={pos.name}
                  onClick={() => handlePositionClick(pos)}
                  className="cursor-pointer group"
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r="12"
                    fill="#142D25"
                    stroke="#B7F34B"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    className="hover:fill-primary/30 transition-all"
                  />
                  <text
                    x={cx}
                    y={cy + 18}
                    fill="#F5F7F4"
                    fontSize="7"
                    textAnchor="middle"
                    className="pointer-events-none opacity-80"
                  >
                    {pos.name}
                  </text>
                </g>
              );
            })}

          {/* Assigned Player Markers */}
          {assignments.map((item) => {
            const player = fieldingTeam.find((p) => p.user_id === item.playerId);
            if (!player) return null;
            const cx = item.x * 400;
            const cy = item.y * 400;
            const isSelected = selectedPlayerId === item.playerId;
            const isWk = item.positionName === 'Wicketkeeper';
            const isBowler = item.positionName === 'Bowler';

            return (
              <g
                key={item.playerId}
                onClick={() => canEdit && setSelectedPlayerId(item.playerId)}
                className={canEdit ? 'cursor-pointer group' : ''}
              >
                {/* Outer Glow on selection */}
                {isSelected && (
                  <circle cx={cx} cy={cy} r="18" fill="none" stroke="#B7F34B" strokeWidth="2.5" />
                )}

                {/* Player Token Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="13"
                  fill={isWk ? '#0284c7' : isBowler ? '#ea580c' : '#142D25'}
                  stroke={isSelected ? '#B7F34B' : '#294237'}
                  strokeWidth="2"
                  className="transition-transform group-hover:scale-110"
                />

                {/* Initial inside token */}
                <text
                  x={cx}
                  y={cy + 4}
                  fill="#F5F7F4"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {player.name.substring(0, 1).toUpperCase()}
                </text>

                {/* Position and Player Name Caption */}
                <rect
                  x={cx - 30}
                  y={cy + 16}
                  width="60"
                  height="12"
                  rx="3"
                  fill="#0B1F19"
                  opacity="0.85"
                />
                <text
                  x={cx}
                  y={cy + 25}
                  fill="#B7F34B"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {item.positionName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Player Contextual Control / Action Panel */}
      {selectedPlayerId && (
        <div className="rounded-xl border border-primary/40 bg-surface p-3 space-y-2 animate-in fade-in">
          {(() => {
            const player = fieldingTeam.find((p) => p.user_id === selectedPlayerId);
            const currentAssignment = assignments.find((a) => a.playerId === selectedPlayerId);
            return (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Selected: {player?.name}
                  </p>
                  <p className="text-[11px] text-primary font-medium">
                    Position: {currentAssignment ? currentAssignment.positionName : 'Unassigned'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-danger hover:bg-danger/10"
                    onClick={() => removeAssignment(selectedPlayerId)}
                  >
                    <X className="h-3 w-3 mr-1" /> Remove
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => setSelectedPlayerId(null)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Unassigned Fielders Selection Carousel */}
      {canEdit && unassignedPlayers.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-subtle p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5 text-primary" />
            Unplaced Fielders ({unassignedPlayers.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unassignedPlayers.map((p) => (
              <button
                key={p.user_id}
                type="button"
                onClick={() => setSelectedPlayerId(p.user_id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  selectedPlayerId === p.user_id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-surface text-foreground hover:border-primary/50'
                }`}
              >
                <span>{p.name}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Click a player, then tap any position marker on the ground to place them.
          </p>
        </div>
      )}

      {/* Save Button */}
      {canEdit && (
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={setFieldPositions.isPending}
            className="bg-primary text-primary-foreground font-bold text-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save Team {activeSide} Field Positions
          </Button>
        </div>
      )}
    </div>
  );
}
