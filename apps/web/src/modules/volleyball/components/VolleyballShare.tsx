import { Copy, MessageCircle, Share2 } from 'lucide-react';
import { Button, Card, useToast } from '@/components/ui';
import { inviteLink, whatsappShareUrl } from '../utils';

export function VolleyballShare({ title, code }: { title: string; code: string }) {
  const { toast } = useToast();
  const link = inviteLink(code);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy', 'Copy the code manually instead.');
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text: `Join our volleyball game "${title}" (code ${code})`, url: link });
        return;
      } catch {
        return; // user dismissed the share sheet
      }
    }
    await copy();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Invitation code</p>
          <p className="font-mono text-xl font-black tracking-widest text-primary">{code}</p>
        </div>
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy link
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={whatsappShareUrl(title, code)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border text-xs font-medium text-foreground hover:bg-surface-subtle"
        >
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
          WhatsApp
        </a>
        <Button size="sm" variant="secondary" onClick={nativeShare}>
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Share
        </Button>
      </div>
    </Card>
  );
}
