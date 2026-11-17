import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFormationStore } from '../store/use-formation-store';
import { PlayerToken } from './player-token';
import { ArrowUp, RefreshCw } from 'lucide-react';
import type { FormationPlayer } from '../types';

export interface TacticalPitchProps {
  teamColor?: string;
  className?: string;
  isReadOnly?: boolean;
  teamId?: string;
  onPlayerDragStart?: (player: FormationPlayer, event: React.PointerEvent<HTMLElement>) => void;
  onPlayerAction?: (player: FormationPlayer, element: HTMLElement) => void;
}

export function TacticalPitch({ teamColor = '#B7F34B', className = '', isReadOnly = false, onPlayerAction, onPlayerDragStart, teamId }: TacticalPitchProps) {
  const pitchRef = useRef<HTMLDivElement>(null);

  const draftPlayers = useFormationStore((s) => s.draftPlayers);
  const activeDragUserId = useFormationStore((s) => s.activeDragUserId);
  const swapTargetUserId = useFormationStore((s) => s.swapTargetUserId);
  const selectedBenchUserId = useFormationStore((s) => s.selectedBenchUserId);
  const selectedPitchUserId = useFormationStore((s) => s.selectedPitchUserId);

  const movePlayerCoordinate = useFormationStore((s) => s.movePlayerCoordinate);
  const swapPlayers = useFormationStore((s) => s.swapPlayers);
  const setActiveDrag = useFormationStore((s) => s.setActiveDrag);
  const setSwapTarget = useFormationStore((s) => s.setSwapTarget);
  const setSelectedPitch = useFormationStore((s) => s.setSelectedPitch);
  const setSelectedBench = useFormationStore((s) => s.setSelectedBench);
  const updatePlayerPosition = useFormationStore((s) => s.updatePlayerPosition);
  const setValidationError = useFormationStore((s) => s.setValidationError);

  // Active drag cursor state
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  // Filter to active pitch starters
  const pitchPlayers = draftPlayers.filter((p) => !p.isSubstitute && p.coordinate !== null);

  const selectedPitchPlayer = pitchPlayers.find((p) => p.userId === selectedPitchUserId);
  const teamHasGoalkeeper = draftPlayers.some(
    (p) => p.positionLabel?.trim().toUpperCase() === 'GK'
  );

  // 1. Pointer Down Handler (Start dragging)
  const handlePointerDown = useCallback(
    (player: FormationPlayer, e: React.PointerEvent<HTMLDivElement>) => {
      if (isReadOnly || onPlayerAction) return;
      e.preventDefault();
      e.stopPropagation();

      const pitchEl = pitchRef.current;
      if (!pitchEl) return;

      pitchEl.setPointerCapture(e.pointerId);

      const currentX = player.coordinate ? player.coordinate.x : 50;
      const currentY = player.coordinate ? player.coordinate.y : 50;

      setActiveDrag(player.userId);
      setDragPosition({ x: currentX, y: currentY });

      // Handle click-to-swap if bench player was previously selected
      if (selectedBenchUserId) {
        swapPlayers(player.userId, selectedBenchUserId);
        setSelectedBench(null);
        setActiveDrag(null);
        setDragPosition(null);
        return;
      }

      // Handle click-to-swap between two starters
      if (selectedPitchUserId && selectedPitchUserId !== player.userId) {
        swapPlayers(selectedPitchUserId, player.userId);
        setSelectedPitch(null);
        setActiveDrag(null);
        setDragPosition(null);
        return;
      }
    },
    [isReadOnly, onPlayerAction, setActiveDrag, selectedBenchUserId, selectedPitchUserId, swapPlayers, setSelectedBench, setSelectedPitch]
  );

  // 2. Pointer Move Handler (Dragging in progress)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!activeDragUserId || !pitchRef.current) return;
      e.preventDefault();

      const rect = pitchRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;

      // Clamp within pitch safety bounds [6, 94]
      const clampedX = Math.max(6, Math.min(94, rawX));
      const clampedY = Math.max(6, Math.min(94, rawY));

      setDragPosition({ x: clampedX, y: clampedY });

      // Proximity Collision Detection (~8.5% radius)
      let closestSwapCandidate: string | null = null;
      let minDistance = 8.5; // threshold in percentage

      for (const other of pitchPlayers) {
        if (other.userId === activeDragUserId || !other.coordinate) continue;
        const dist = Math.hypot(clampedX - other.coordinate.x, clampedY - other.coordinate.y);
        if (dist <= minDistance) {
          closestSwapCandidate = other.userId;
          minDistance = dist;
        }
      }

      setSwapTarget(closestSwapCandidate);
    },
    [activeDragUserId, pitchPlayers, setSwapTarget]
  );

  // 3. Pointer Up / End Handler (Drop)
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!activeDragUserId) return;
      e.preventDefault();

      const pitchEl = pitchRef.current;
      if (pitchEl && pitchEl.hasPointerCapture(e.pointerId)) {
        pitchEl.releasePointerCapture(e.pointerId);
      }

      const currentSwapTarget = useFormationStore.getState().swapTargetUserId;

      if (currentSwapTarget && currentSwapTarget !== activeDragUserId) {
        // Atomic Proximity Swap
        swapPlayers(activeDragUserId, currentSwapTarget);
      } else if (dragPosition) {
        // Move to final dragged coordinate
        movePlayerCoordinate(activeDragUserId, dragPosition);
      }

      setActiveDrag(null);
      setSwapTarget(null);
      setDragPosition(null);
    },
    [activeDragUserId, dragPosition, movePlayerCoordinate, setActiveDrag, setSwapTarget, swapPlayers]
  );

  // Clean up pointer capture if interrupted
  useEffect(() => {
    const handleWindowBlur = () => {
      setActiveDrag(null);
      setSwapTarget(null);
      setDragPosition(null);
    };
    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [setActiveDrag, setSwapTarget]);

  return (
    <div className={`relative mx-auto w-full max-w-lg select-none ${className}`}>
      {/* Direction of Attack Header Indicator */}
      <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-surface border border-border text-[11px] font-bold text-foreground/80 tracking-wider shadow-sm">
        <div className="flex items-center gap-1.5 text-primary">
          <ArrowUp className="h-3.5 w-3.5 animate-pulse" />
          <span className="uppercase">Attacking Direction</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          {isReadOnly ? 'Viewing Mode (Live Lineup)' : 'Drag & Drop or Tap to Swap'}
        </span>
      </div>

      {/* Selected Pitch Player Position Editor with Goalkeeper Enforcement */}
      {!isReadOnly && selectedPitchPlayer && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-lg bg-surface border border-border text-xs shadow-md">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-foreground truncate">{selectedPitchPlayer.displayName}:</span>
            <span className="text-muted-foreground text-[11px] shrink-0">Role:</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {(['GK', 'DEF', 'MID', 'ATT'] as const).map((pos) => {
              const isCurrent = (selectedPitchPlayer.positionLabel || '').toUpperCase() === pos;
              const isGkDisabled = pos === 'GK' && !isCurrent && teamHasGoalkeeper;

              return (
                <button
                  key={pos}
                  type="button"
                  disabled={isGkDisabled}
                  onClick={() => {
                    if (isGkDisabled) {
                      setValidationError('This team already has a goalkeeper. Only one goalkeeper is allowed per team.');
                      return;
                    }
                    updatePlayerPosition(selectedPitchPlayer.userId, pos);
                  }}
                  title={
                    isGkDisabled
                      ? 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.'
                      : `Set as ${pos}`
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition-all ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary'
                      : isGkDisabled
                      ? 'opacity-40 cursor-not-allowed bg-surface-subtle text-muted-foreground line-through'
                      : 'bg-surface-subtle text-foreground hover:bg-surface-subtle/80 border border-border'
                  }`}
                >
                  {pos}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Tactical Pitch Container */}
      <div
        ref={pitchRef}
        data-lineup-zone={teamId}
        data-lineup-pitch="true"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative aspect-[3/4] w-full rounded-2xl border-4 border-emerald-700/60 dark:border-[#234E42] bg-gradient-to-b from-[#15803D] via-[#166534] to-[#14532D] dark:from-[#0F2A22] dark:via-[#0B1F19] dark:to-[#0A1A15] p-3 shadow-2xl overflow-hidden touch-pan-y"
        style={{
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Subtle Alternating Mowed Grass Lawn Stripes (5 stripes across height) */}
        <div className="absolute inset-0 flex flex-col pointer-events-none opacity-20">
          <div className="flex-1 bg-black/15" />
          <div className="flex-1 bg-transparent" />
          <div className="flex-1 bg-black/15" />
          <div className="flex-1 bg-transparent" />
          <div className="flex-1 bg-black/15" />
          <div className="flex-1 bg-transparent" />
        </div>

        {/* Crisp White / Emerald Pitch Markings SVG */}
        <svg
          viewBox="0 0 100 133.33"
          className="absolute inset-0 h-full w-full pointer-events-none stroke-white/85 dark:stroke-[#B7F34B] dark:opacity-40 stroke-[0.45] fill-none"
          preserveAspectRatio="none"
        >
          {/* Outer Boundary */}
          <rect x="5" y="4" width="90" height="125.33" rx="1" />

          {/* Halfway Line */}
          <line x1="5" y1="66.66" x2="95" y2="66.66" />

          {/* Center Circle & Spot */}
          <circle cx="50" cy="66.66" r="13" />
          <circle cx="50" cy="66.66" r="0.8" className="fill-white/85 dark:fill-[#B7F34B]" />

          {/* Top Penalty Box (Opponent) */}
          <rect x="22" y="4" width="56" height="22" />
          <rect x="34" y="4" width="32" height="8" />
          <circle cx="50" cy="18" r="0.8" className="fill-white/85 dark:fill-[#B7F34B]" />
          <path d="M 40 26 A 11 11 0 0 0 60 26" />

          {/* Bottom Penalty Box (Home) */}
          <rect x="22" y="107.33" width="56" height="22" />
          <rect x="34" y="121.33" width="32" height="8" />
          <circle cx="50" cy="113.33" r="0.8" className="fill-white/85 dark:fill-[#B7F34B]" />
          <path d="M 40 107.33 A 11 11 0 0 1 60 107.33" />

          {/* Corner Arcs */}
          <path d="M 5 8 A 4 4 0 0 0 9 4" />
          <path d="M 95 8 A 4 4 0 0 1 91 4" />
          <path d="M 5 125.33 A 4 4 0 0 1 9 129.33" />
          <path d="M 95 125.33 A 4 4 0 0 0 91 129.33" />
        </svg>

        {/* Tactical Pitch Players */}
        {pitchPlayers.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="rounded-xl border border-border bg-surface/95 text-foreground p-5 backdrop-blur-md max-w-xs shadow-card">
              <RefreshCw className="h-6 w-6 text-primary mx-auto mb-2 animate-spin" />
              <h4 className="text-sm font-bold text-foreground">Pitch Lineup Empty</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Select a tactical preset above or promote players from the bench below.
              </p>
            </div>
          </div>
        ) : (
          pitchPlayers.map((player) => {
            const isBeingDragged = activeDragUserId === player.userId;
            const isSwapTarget = swapTargetUserId === player.userId;
            const isSelected = selectedPitchUserId === player.userId;

            // Use drag coordinate if active, else standard coordinate
            const posX = isBeingDragged && dragPosition ? dragPosition.x : player.coordinate?.x ?? 50;
            const posY = isBeingDragged && dragPosition ? dragPosition.y : player.coordinate?.y ?? 50;

            return (
              <div
                key={player.userId}
                style={{
                  position: 'absolute',
                  left: `${posX}%`,
                  top: `${posY}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: isBeingDragged ? 'none' : 'left 0.25s cubic-bezier(0.2, 0, 0, 1), top 0.25s cubic-bezier(0.2, 0, 0, 1)',
                  zIndex: isBeingDragged ? 40 : 20,
                }}
              >
                <PlayerToken
                  player={player}
                  isDragging={isBeingDragged}
                  isSwapTarget={isSwapTarget}
                  isSelected={isSelected}
                  teamColor={teamColor}
                  onPointerDown={(e) => onPlayerDragStart ? onPlayerDragStart(player,e) : handlePointerDown(player, e)}
                  onClick={event => {
                    if (isReadOnly) return;
                    if (onPlayerAction) { onPlayerAction(player, event.currentTarget); return; }
                    if (selectedBenchUserId) {
                      swapPlayers(player.userId, selectedBenchUserId);
                      setSelectedBench(null);
                    } else if (selectedPitchUserId) {
                      swapPlayers(selectedPitchUserId, player.userId);
                      setSelectedPitch(null);
                    } else {
                      setSelectedPitch(player.userId);
                    }
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
