import { Copy, Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, useToast } from '@/components/ui';

export function CricketShare({ title, code }: { title: string; code: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/cricket/join?code=${code}`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Invite Code Copied', `Code ${code} copied to clipboard.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy code');
    }
  };

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${title} on Kalikkanundo`,
          text: `Join our cricket match "${title}"! Use invite code: ${code}`,
          url: inviteUrl,
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }
    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite Link Copied', 'Paste anywhere to invite players.');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <Card className="p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Invite Players</h2>
          <p className="text-xs text-muted-foreground">Share this code with your cricket squad</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-xl border border-border bg-surface-subtle px-3 py-2 text-center font-mono text-base font-extrabold tracking-widest text-primary">
          {code}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={copyCode}
          aria-label="Copy invitation code"
          className="h-10 px-3"
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={shareInvite}
          className="h-10 px-3.5 bg-primary text-primary-foreground font-bold"
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
      </div>
    </Card>
  );
}
