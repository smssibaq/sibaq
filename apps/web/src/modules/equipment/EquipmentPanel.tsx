import React, { useState } from 'react';
import { AlertTriangle, Copy, PackagePlus, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { supabase } from '@/infrastructure/supabase/client';
import {
  useGameEquipment,
  useClaimEquipment,
  useAddEquipment,
  useRemoveEquipment,
  useSetEquipmentBrought,
  useEquipmentRealtime,
} from './api';
import { EquipmentRow } from './EquipmentRow';

export interface EquipmentPanelProps {
  gameId: string;
  className?: string;
}

export function EquipmentPanel({ gameId, className }: EquipmentPanelProps) {
  const { data: summary, isLoading, isError, refetch } = useGameEquipment(gameId);
  useEquipmentRealtime(gameId);

  const claimMutation = useClaimEquipment(gameId);
  const addMutation = useAddEquipment(gameId);
  const removeMutation = useRemoveEquipment(gameId);
  const setBroughtMutation = useSetEquipmentBrought(gameId);

  const { toast } = useToast();
  const [newItemName, setNewItemName] = useState('');
  const [isNewRequired, setIsNewRequired] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    addMutation.mutate(
      { item: trimmed, isRequired: isNewRequired },
      {
        onSuccess: () => {
          setNewItemName('');
          setIsNewRequired(false);
        },
      }
    );
  };

  const handleCopyWhatsApp = async () => {
    if (!summary) return;
    setIsCopying(true);
    try {
      let title = 'Game';
      const { data } = await supabase.rpc('get_game_context', { p_game: gameId });
      if (data && data[0]?.title) {
        title = data[0].title;
      }

      const lines = [
        `🎒 ${title} – kit`,
        ...summary.items.map((it) => {
          if (it.claimed_by) {
            const who = it.claimed_by_name || (it.is_mine ? 'You' : 'Someone');
            const note = it.note ? ` (${it.note})` : '';
            return `✅ ${it.item} – ${who}${note}`;
          }
          return `❌ ${it.item} – nobody yet`;
        }),
      ];

      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Copied for WhatsApp');
    } catch {
      toast.error('Could not copy to clipboard');
    } finally {
      setIsCopying(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={`border border-white/10 bg-[#0B1F19] text-white ${className ?? ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44 bg-white/10" />
            <Skeleton className="h-6 w-20 bg-white/10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Skeleton className="h-14 w-full bg-white/5 rounded-xl" />
          <Skeleton className="h-14 w-full bg-white/5 rounded-xl" />
          <Skeleton className="h-14 w-full bg-white/5 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !summary) {
    return (
      <Card className={`border border-white/10 bg-[#0B1F19] text-white ${className ?? ''}`}>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-white/70 mb-3">Unable to load kit checklist.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="text-white border-white/20">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const unclaimedRequiredNames = summary.items
    .filter((i) => i.is_required && !i.claimed_by)
    .map((i) => i.item);

  return (
    <Card className={`border border-white/10 bg-[#0B1F19] text-white shadow-lg ${className ?? ''}`}>
      <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">🎒</span>
            <CardTitle className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              Who&apos;s bringing what?
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full bg-[#132E26] border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90">
              {summary.claimed_count}/{summary.total_count} sorted
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCopyWhatsApp}
              disabled={isCopying}
              className="h-8 px-2 text-xs text-white/80 hover:text-white hover:bg-white/10"
              title="Copy for WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5 mr-1" />
              WhatsApp
            </Button>
          </div>
        </div>

        {summary.unclaimed_required > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Nobody is bringing the {unclaimedRequiredNames.join(', ')} yet
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
        {/* Checklist rows */}
        <div className="space-y-2">
          {summary.items.map((item) => (
            <EquipmentRow
              key={item.id}
              item={item}
              canEdit={summary.can_edit}
              canClaim={summary.can_claim}
              onClaim={(itemId, note) => claimMutation.mutate({ itemId, claim: true, note })}
              onRelease={(itemId) => claimMutation.mutate({ itemId, claim: false })}
              onToggleBrought={(itemId, isBrought) => setBroughtMutation.mutate({ itemId, isBrought })}
              onRemove={(itemId) => removeMutation.mutate({ itemId })}
              isClaimPending={claimMutation.isPending}
              isBroughtPending={setBroughtMutation.isPending}
              isRemovePending={removeMutation.isPending}
            />
          ))}
          {summary.items.length === 0 && (
            <p className="text-center text-xs text-white/50 py-3">No kit items added yet.</p>
          )}
        </div>

        {/* Add custom item form */}
        <form onSubmit={handleAddItem} className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Add item (e.g. Cones, Whistle)"
              maxLength={40}
              className="h-10 min-h-[44px] text-xs sm:text-sm bg-[#132E26] border-white/10 text-white placeholder:text-white/40"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newItemName.trim() || addMutation.isPending}
              isLoading={addMutation.isPending}
              className="h-10 min-h-[44px] bg-[#B7F34B] text-[#0B1F19] hover:bg-[#a6e03e] font-bold px-4 text-xs sm:text-sm shrink-0"
            >
              <PackagePlus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>

          {summary.can_edit && (
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-white/70 hover:text-white/90">
              <input
                type="checkbox"
                checked={isNewRequired}
                onChange={(e) => setIsNewRequired(e.target.checked)}
                className="rounded border-white/20 bg-[#132E26] text-[#B7F34B] focus:ring-0 focus:ring-offset-0 h-4 w-4"
              />
              <span>Mark as needed (required for game)</span>
            </label>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
