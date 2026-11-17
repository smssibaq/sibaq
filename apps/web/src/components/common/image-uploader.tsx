import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Camera, Trash2, Upload, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  IMAGE_ACCEPT,
  imageErrorMessage,
  prepareSquareImage,
  type PreparedImage,
} from '@/lib/supabase/image-upload';

interface ImageUploaderProps {
  shape: 'circle' | 'rounded';
  /** What the picture is called in the UI, e.g. "photo" or "logo". */
  noun: string;
  currentUrl: string | null | undefined;
  /** Shown when there is no (working) image: initials, icon... */
  fallback: ReactNode;
  canEdit: boolean;
  onUpload: (image: PreparedImage) => Promise<unknown>;
  onRemove?: () => Promise<unknown>;
  /** Create flows: the picked image is handed to the parent and uploaded later. */
  deferred?: boolean;
  className?: string;
}

/** Compact picker: preview before saving, drag & drop on desktop, camera/file picker on mobile. */
export function ImageUploader({ shape, noun, currentUrl, fallback, canEdit, onUpload, onRemove, deferred, className }: ImageUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PreparedImage | null>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | 'prepare' | null>(null);
  const [dragging, setDragging] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => setImgFailed(false), [currentUrl]);
  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.previewUrl); }, [pending]);

  const frame = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  const shown = pending?.previewUrl ?? (imgFailed ? null : currentUrl) ?? null;
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);

  async function choose(file: File | undefined) {
    if (!file || !canEdit) return;
    setBusy('prepare');
    try {
      setPending(await prepareSquareImage(file));
    } catch (error) {
      toast.error('Invalid image', imageErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!pending) return;
    setBusy('upload');
    try {
      await onUpload(pending);
      setPending(null);
      if (deferred) toast.info(`${Noun} selected`, 'It uploads when you finish creating.');
      else toast.success(`${Noun} updated`);
    } catch (error) {
      toast.error(`Could not update ${noun}`, imageErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!onRemove) return;
    setBusy('remove');
    try {
      await onRemove();
      toast.success(`${Noun} removed`);
    } catch (error) {
      toast.error(`Could not remove ${noun}`, imageErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={clsx('flex items-center gap-4', className)}>
      <div
        className="relative shrink-0"
        onDragOver={(e) => { if (canEdit) { e.preventDefault(); setDragging(true); } }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void choose(e.dataTransfer.files?.[0]); }}
      >
        <div
          className={clsx(
            'flex h-24 w-24 items-center justify-center overflow-hidden border bg-surface-subtle text-primary text-2xl font-bold transition-colors',
            frame,
            dragging ? 'border-primary border-dashed' : 'border-border'
          )}
        >
          {shown ? (
            <img src={shown} alt={noun} onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
          ) : (
            fallback
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70" role="status" aria-label="Uploading">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
        {canEdit && !pending && (
          <button
            type="button"
            aria-label={currentUrl ? `Change ${noun}` : `Upload ${noun}`}
            disabled={busy !== null}
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void choose(f); }}
        />
      </div>

      {canEdit && (
        <div className="min-w-0 flex-1 space-y-2">
          {pending ? (
            <>
              <p className="text-xs text-muted-foreground">Preview · cropped to a square</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={save} isLoading={busy === 'upload'}>
                  <Upload className="mr-1.5 h-4 w-4" /> {deferred ? `Use this ${noun}` : `Save ${noun}`}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy === 'upload'} onClick={() => setPending(null)}>
                  <X className="mr-1.5 h-4 w-4" /> Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => inputRef.current?.click()}>
                  <Camera className="mr-1.5 h-4 w-4" /> {currentUrl ? `Change ${noun}` : `Upload ${noun}`}
                </Button>
                {currentUrl && onRemove && (
                  <Button type="button" size="sm" variant="ghost" className="text-danger" isLoading={busy === 'remove'} disabled={busy !== null} onClick={remove}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 2 MB. You can also drop a file here.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
