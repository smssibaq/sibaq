import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { normalizeError } from '@/lib/errors';
import { ratingsApi, ratingsKeys } from './api';

export function StarRating({
  value,
  onChange,
  size = 'md',
  disabled,
  label,
}: {
  value: number | null;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const px = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7';
  return (
    <div className="flex gap-0.5" role="radiogroup" aria-label={label ?? 'Rating'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          disabled={disabled || !onChange}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange?.(n)}
          className="p-0.5 disabled:cursor-default"
        >
          <Star className={clsx(px, n <= shown ? 'fill-primary text-primary' : 'text-muted-foreground')} />
        </button>
      ))}
    </div>
  );
}

/**
 * Drop-in ratings for any sport's game page. Renders nothing until the game has started
 * or when the viewer is neither a participant nor an organizer.
 */
export function RatingsPanel({ gameId, className }: { gameId: string; className?: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: summary } = useQuery({
    queryKey: ratingsKeys.summary(gameId),
    queryFn: () => ratingsApi.getSummary(gameId),
  });

  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    setRating(summary?.my_review?.rating ?? null);
    setFeedback(summary?.my_review?.feedback ?? '');
  }, [summary?.my_review?.rating, summary?.my_review?.feedback]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ratingsKeys.summary(gameId) });

  const reviewMutation = useMutation({
    mutationFn: () => ratingsApi.reviewMatch(gameId, rating ?? 0, feedback),
    onSuccess: () => {
      toast.success('Thanks for the feedback');
      refresh();
    },
    onError: (err) => toast.error('Could not save review', normalizeError(err).message),
  });

  const rateMutation = useMutation({
    mutationFn: ({ playerId, value }: { playerId: string; value: number }) =>
      ratingsApi.ratePlayer(gameId, playerId, value),
    onSuccess: refresh,
    onError: (err) => toast.error('Could not save rating', normalizeError(err).message),
  });

  if (!summary || !summary.is_open) return null;
  if (!summary.is_organizer && !summary.is_participant) return null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>How did it go?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {summary.match_count ? (
          <p className="text-sm text-muted-foreground">
            Match rating{' '}
            <span className="font-bold text-foreground">{Number(summary.match_avg).toFixed(1)}</span> / 5 from{' '}
            {summary.match_count} review{summary.match_count === 1 ? '' : 's'}
          </p>
        ) : null}

        {summary.is_participant && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Rate this game</p>
            <StarRating value={rating} onChange={setRating} label="Match rating" />
            <Textarea
              value={feedback}
              maxLength={500}
              rows={3}
              placeholder="Anything to keep or change next time? (optional)"
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{feedback.length}/500</span>
              <Button
                size="sm"
                disabled={!rating}
                isLoading={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate()}
              >
                {summary.my_review ? 'Update review' : 'Submit review'}
              </Button>
            </div>
          </div>
        )}

        {summary.is_organizer && summary.players && summary.players.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Rate players</p>
            <p className="text-xs text-muted-foreground">Private to organizers. Keep it constructive.</p>
            <ul className="divide-y divide-border">
              {summary.players.map((p) => (
                <li key={p.player_id} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-sm truncate">{p.display_name}</span>
                  <StarRating
                    size="sm"
                    value={p.my_rating}
                    disabled={rateMutation.isPending}
                    label={`Rating for ${p.display_name}`}
                    onChange={(value) => rateMutation.mutate({ playerId: p.player_id, value })}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
