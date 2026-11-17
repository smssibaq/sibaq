import { useState } from 'react';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EquipmentItem } from './types';

interface EquipmentRowProps {
  item: EquipmentItem;
  canEdit: boolean;
  canClaim: boolean;
  onClaim: (itemId: string, note?: string | null) => void;
  onRelease: (itemId: string) => void;
  onToggleBrought: (itemId: string, isBrought: boolean) => void;
  onRemove: (itemId: string) => void;
  isClaimPending?: boolean;
  isBroughtPending?: boolean;
  isRemovePending?: boolean;
}

export function EquipmentRow({
  item,
  canEdit,
  canClaim,
  onClaim,
  onRelease,
  onToggleBrought,
  onRemove,
  isClaimPending,
  isBroughtPending,
  isRemovePending,
}: EquipmentRowProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(item.note ?? '');

  const isClaimed = Boolean(item.claimed_by);
  const canToggleBrought = item.is_mine || canEdit;
  const canRelease = isClaimed && (item.is_mine || canEdit);

  const handleSaveNote = () => {
    onClaim(item.id, noteText.trim() || null);
    setShowNoteInput(false);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#132E26] p-3 text-white transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2 min-h-[44px]">
        {/* Left: Item name + Needed badge */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm sm:text-base tracking-tight truncate">
            {item.item}
          </span>
          {item.is_required && (
            <Badge className="bg-[#B7F34B] text-[#0B1F19] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
              Needed
            </Badge>
          )}
          {item.is_brought && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B7F34B]">
              <CheckCircle2 className="h-4 w-4" />
              Brought
            </span>
          )}
        </div>

        {/* Right: Claimed info or claim button */}
        <div className="flex items-center gap-2 ml-auto">
          {isClaimed ? (
            <div className="flex items-center gap-2">
              <Avatar
                src={item.claimed_by_avatar}
                userId={item.claimed_by ?? undefined}
                fallback={item.claimed_by_name ?? 'Player'}
                size="sm"
                className="h-8 w-8 border border-white/20 bg-[#0B1F19] text-white text-xs"
              />
              <span className="text-sm font-medium text-white/90">
                {item.is_mine ? 'You' : item.claimed_by_name || 'Someone'}
              </span>
            </div>
          ) : (
            <Button
              size="sm"
              variant="default"
              disabled={!canClaim || isClaimPending}
              isLoading={isClaimPending}
              onClick={() => onClaim(item.id, null)}
              className="min-h-[44px] bg-[#B7F34B] text-[#0B1F19] hover:bg-[#a6e03e] font-bold px-3 text-xs sm:text-sm"
              title={!canClaim ? 'RSVP first' : "I'll bring it"}
            >
              {!canClaim ? 'RSVP first' : "I'll bring it"}
            </Button>
          )}

          {/* Organizer delete item */}
          {item.can_remove && (
            <button
              type="button"
              disabled={isRemovePending}
              onClick={() => onRemove(item.id)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-red-400 transition-colors"
              title="Remove item"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Note display */}
      {item.note && !showNoteInput && (
        <p className="text-xs text-white/70 italic pl-1">
          &ldquo;{item.note}&rdquo;
        </p>
      )}

      {/* Inline note editor */}
      {showNoteInput && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Have 10 in the car"
            maxLength={80}
            className="h-9 text-xs bg-[#0B1F19] border-white/15 text-white placeholder:text-white/40"
          />
          <Button
            size="sm"
            onClick={handleSaveNote}
            disabled={isClaimPending}
            className="h-9 bg-[#B7F34B] text-[#0B1F19] text-xs font-semibold px-3"
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNoteInput(false)}
            className="h-9 text-white/60 hover:text-white text-xs px-2"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Action buttons when claimed */}
      {isClaimed && (canToggleBrought || canRelease || item.is_mine) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-xs">
          {canToggleBrought && (
            <button
              type="button"
              disabled={isBroughtPending}
              onClick={() => onToggleBrought(item.id, !item.is_brought)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              {item.is_brought ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#B7F34B]" />
                  <span>Brought it ✅</span>
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4 text-white/40" />
                  <span>Mark brought</span>
                </>
              )}
            </button>
          )}

          {item.is_mine && !showNoteInput && (
            <button
              type="button"
              onClick={() => {
                setNoteText(item.note ?? '');
                setShowNoteInput(true);
              }}
              className="inline-flex min-h-[36px] items-center rounded-lg px-2.5 py-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              {item.note ? 'Edit note' : 'Add note'}
            </button>
          )}

          {canRelease && (
            <button
              type="button"
              disabled={isClaimPending}
              onClick={() => onRelease(item.id)}
              className="inline-flex min-h-[36px] items-center rounded-lg px-2.5 py-1 text-red-300 hover:bg-red-500/10 transition-colors ml-auto"
            >
              {item.is_mine ? 'Not me anymore' : 'Release'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
