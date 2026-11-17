import { useEffect, useRef, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button, Card, FormField, Input, useToast } from '@/components/ui';
import { normalizeError } from '@/lib/errors';
import { useJoinByCode } from '../api';
import { cricketPaths, useCricketNav } from '../utils';

export function CricketJoinPage() {
  const go = useCricketNav();
  const { toast } = useToast();
  const search = useSearch({ strict: false }) as { code?: string };
  const initialCode = (search.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const autoJoined = useRef(false);

  const joinMutation = useJoinByCode();

  const handleJoin = (targetCode: string) => {
    const clean = targetCode.trim().toUpperCase();
    if (clean.length < 4) {
      setError('Please enter a valid invitation code.');
      return;
    }
    setError(null);

    joinMutation.mutate(clean, {
      onSuccess: (gameId) => {
        toast.success('Joined Cricket Match', 'You have been added to the game roster.');
        go(cricketPaths.game(gameId));
      },
      onError: (err) => {
        const norm = normalizeError(err);
        setError(norm.message);
      },
    });
  };

  useEffect(() => {
    if (initialCode && !autoJoined.current) {
      autoJoined.current = true;
      handleJoin(initialCode);
    }
  }, [initialCode]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <button
        type="button"
        onClick={() => go(cricketPaths.hub)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All cricket games
      </button>

      <PageHeader
        title="Join cricket match"
        description="Enter the invitation code shared by the match organizer."
      />

      <Card className="p-4 sm:p-6 space-y-4">
        <FormField label="Invitation Code" htmlFor="invite-code" error={error ?? undefined} required>
          <div className="relative">
            <Input
              id="invite-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                setError(null);
              }}
              placeholder="e.g. CRK9281"
              maxLength={12}
              className="text-center font-mono text-lg font-bold tracking-widest h-12 uppercase"
              autoFocus
            />
          </div>
        </FormField>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => go(cricketPaths.hub)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-primary text-primary-foreground font-bold"
            disabled={code.length < 4 || joinMutation.isPending}
            isLoading={joinMutation.isPending}
            onClick={() => handleJoin(code)}
          >
            <KeyRound className="h-4 w-4 mr-1.5" />
            Join Match
          </Button>
        </div>
      </Card>
    </div>
  );
}
