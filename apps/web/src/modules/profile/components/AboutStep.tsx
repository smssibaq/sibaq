import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { uploadAvatarImage } from '@/lib/supabase/storage';
import { profileErrorMessage } from '../api';
import type { ProfileDraft } from '../types';

export function AboutStep({draft,onChange,disabled,onUploading}: {
  draft:ProfileDraft; onChange:(draft:ProfileDraft)=>void; disabled?:boolean;
  onUploading:(busy:boolean)=>void;
}) {
  const [uploading,setUploading]=useState(false);
  const {toast}=useToast();
  return <section className="space-y-5" aria-label="About you">
    <div className="flex items-center gap-4">
      <Avatar src={draft.avatarUrl} fallback={draft.displayName || 'P'} size="xl" />
      <label className="min-w-0 flex-1 space-y-1 text-sm font-medium">Avatar (optional)
        <Input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || uploading}
          aria-label="Upload avatar" onChange={async event=>{
            const file=event.target.files?.[0]; event.target.value=''; if(!file)return;
            setUploading(true);onUploading(true);
            try { const url=await uploadAvatarImage(file);onChange({...draft,avatarUrl:url});toast.success('Avatar uploaded'); }
            catch(error){toast.error('Upload failed',profileErrorMessage(error));}
            finally{setUploading(false);onUploading(false);}
          }} />
        <p className="text-xs text-muted-foreground">{uploading?'Uploading...':'JPG, PNG or WebP, up to 2 MB'}</p>
      </label>
    </div>
    <label className="block space-y-1 text-sm font-medium">Display name
      <Input autoComplete="nickname" required minLength={2} maxLength={40} value={draft.displayName} disabled={disabled}
        onChange={e=>onChange({...draft,displayName:e.target.value})} placeholder="What should your squad call you?" />
    </label>
    <label className="block space-y-1 text-sm font-medium">Home area (optional)
      <Input autoComplete="address-level2" maxLength={80} value={draft.homeArea} disabled={disabled}
        onChange={e=>onChange({...draft,homeArea:e.target.value})} placeholder="Kakkanad" />
    </label>
    <label className="block space-y-1 text-sm font-medium">Short bio (optional)
      <Textarea maxLength={160} rows={3} value={draft.bio} disabled={disabled}
        onChange={e=>onChange({...draft,bio:e.target.value})} placeholder="A little about you and your game" />
      <span className="text-xs text-muted-foreground">{draft.bio.length}/160</span>
    </label>
  </section>;
}
