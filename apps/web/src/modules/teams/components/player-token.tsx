import React from 'react';
import type { FormationPlayer } from '../types';
import { inferTacticalZone, getTacticalZoneStyle } from '../presets';

export interface PlayerTokenProps {
  player: FormationPlayer;
  isDragging?: boolean;
  isSwapTarget?: boolean;
  isSelected?: boolean;
  teamColor?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const PlayerToken = React.memo(function PlayerToken({
  player,
  isDragging = false,
  isSwapTarget = false,
  isSelected = false,
  teamColor = '#B7F34B',
  onPointerDown,
  onClick,
  className = '',
  style,
}: PlayerTokenProps) {
  const coord = player.coordinate;
  const tacticalZone = coord ? inferTacticalZone(coord.y) : 'MID';
  const zoneStyle = getTacticalZoneStyle(tacticalZone);

  // Compute initials from display name
  const name = player.displayName || 'Player';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P';

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onClick={onClick}
      aria-label={`Actions for ${name}`}
      aria-haspopup="menu"
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick?.(event); } }}
      style={style}
      className={`group relative flex flex-col items-center justify-center select-none cursor-grab active:cursor-grabbing transition-transform duration-150 touch-none ${
        isDragging ? 'scale-110 z-40 cursor-grabbing' : 'z-20 hover:scale-105'
      } ${className}`}
    >
      {/* Outer Swap Pulsing Ring (When proximity swap is active) */}
      {isSwapTarget && (
        <div className="absolute -inset-3.5 rounded-full border-2 border-dashed border-[#B7F34B] bg-[#B7F34B]/20 animate-pulse pointer-events-none z-0">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-wider uppercase bg-[#B7F34B] text-[#0B1F19] px-1.5 py-0.2 rounded-full shadow-md">
            SWAP
          </span>
        </div>
      )}

      {/* Selected for Click-to-Swap Ring */}
      {isSelected && !isSwapTarget && (
        <div className="absolute -inset-2.5 rounded-full border-2 border-[#B7F34B] bg-[#B7F34B]/15 animate-ping pointer-events-none" />
      )}

      {/* Main Avatar / Circular Card */}
      <div
        className={`relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 shadow-lg backdrop-blur-md transition-all ${
          isSwapTarget
            ? 'border-primary bg-primary/20 ring-4 ring-primary/40 shadow-lg'
            : isSelected
            ? 'border-primary bg-surface ring-2 ring-primary'
            : isDragging
            ? 'border-primary bg-surface shadow-[0_12px_30px_rgba(0,0,0,0.6)]'
            : 'border-white/50 dark:border-[#234E42] bg-surface text-foreground hover:border-primary/80'
        } ${zoneStyle.cardGlow}`}
      >
        {player.avatarUrl ? (
          <img
            src={player.avatarUrl}
            alt={name}
            className="h-full w-full rounded-full object-cover pointer-events-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b from-emerald-700 to-emerald-950 dark:from-[#1B3D33] dark:to-[#0E241E] text-xs sm:text-sm font-black text-white">
            {initials}
          </div>
        )}

        {/* Tactical Role Badge pill on bottom */}
        <span
          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-black uppercase tracking-tight rounded px-1.5 py-0.5 border shadow-sm leading-none ${
            zoneStyle.badgeBg
          }`}
        >
          {player.positionLabel || tacticalZone}
        </span>

        {/* Small Team Side Indicator Dot */}
        <span
          className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border border-black/40 shadow-sm"
          style={{ backgroundColor: teamColor }}
        />
      </div>

      {/* Name Label */}
      <span className="mt-2 max-w-[76px] sm:max-w-[84px] truncate text-center text-[10px] sm:text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] bg-black/75 dark:bg-[#0B1F19]/80 px-1.5 py-0.5 rounded border border-white/20 dark:border-[#234E42]/60 pointer-events-none">
        {name}
      </span>
    </div>
  );
});

