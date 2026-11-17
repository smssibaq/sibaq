import { useState, type FormEvent } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from './auth-provider';
import { AvatarUploader } from '@/modules/profile/components/AvatarUploader';
import { AboutStep } from '@/modules/profile/components/AboutStep';
import { SportPicker } from '@/modules/profile/components/SportPicker';
import { SportPlayStyle } from '@/modules/profile/components/SportPlayStyle';
import { useProfileEditor } from '@/modules/profile/use-profile-editor';
import { profileErrorMessage } from '@/modules/profile/api';

function ProfileEditor({onDone}:{onDone:()=>void}) {
  const editor=useProfileEditor();
  const {draft,setDraft,catalog,busy,setUploading}=editor;
  async function submit(event:FormEvent){event.preventDefault();if(await editor.save())onDone();}
  return (
    <form onSubmit={submit} className="space-y-6">
      {/* 1. About You Section */}
      <Card className="rounded-2xl border border-border bg-surface shadow-card p-4 sm:p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-foreground">About you</h2>
        <AboutStep draft={draft} onChange={setDraft} onUploading={setUploading} disabled={busy} />
      </Card>

      {/* 2. Your Sports Section */}
      <Card className="rounded-2xl border border-border bg-surface shadow-card p-4 sm:p-6 space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-foreground">Your sports</h2>
        {catalog.isPending && <p role="status" className="text-xs text-muted-foreground animate-pulse">Loading sports catalog...</p>}
        {catalog.isError && (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-danger">{profileErrorMessage(catalog.error)}</p>
            <Button type="button" variant="outline" size="sm" onClick={()=>{void catalog.refetch();}}>Retry sports catalog</Button>
          </div>
        )}
        {catalog.data && (
          <SportPicker
            catalog={catalog.data}
            value={draft.sports}
            onChange={(sports)=>setDraft({...draft,sports})}
            disabled={busy}
          />
        )}
      </Card>

      {/* 3. How You Play Section */}
      {draft.sports.length > 0 && catalog.data && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-foreground">How you play</h2>
            <span className="text-xs text-muted-foreground">
              {draft.sports.length} sport{draft.sports.length > 1 ? 's' : ''} configured
            </span>
          </div>
          <SportPlayStyle
            catalog={catalog.data}
            value={draft.sports}
            onChange={(sports)=>setDraft({...draft,sports})}
            disabled={busy}
          />
        </div>
      )}

      {/* 4. Sticky Bottom Actions Bar */}
      <footer className="sticky bottom-20 lg:bottom-4 z-20 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3.5 sm:p-4 backdrop-blur-md shadow-2xl mt-8">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] flex-1 text-xs sm:text-sm font-semibold border-border hover:bg-surface-subtle"
          onClick={onDone}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="min-h-[44px] flex-1 bg-primary text-primary-foreground hover:bg-primary-hover text-xs sm:text-sm font-bold shadow-md transition-all"
          isLoading={busy}
          disabled={!catalog.data?.length || !draft.sports.length}
        >
          {busy ? 'Saving...' : 'Save Profile'}
        </Button>
      </footer>
    </form>
  );
}

export function ProfilePage() {
  const {profile}=useAuth();
  const [editing,setEditing]=useState(false);
  if(!profile)return null;
  if(editing)return <div className="mx-auto max-w-2xl space-y-5 pb-6"><h1 className="text-2xl font-black">Edit profile</h1><ProfileEditor onDone={()=>setEditing(false)} /></div>;
  return <div className="mx-auto max-w-2xl space-y-5 pb-6">
    <h1 className="text-2xl font-black">Your profile</h1>
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        {profile.is_me ? <AvatarUploader /> : <Avatar src={profile.avatar_url} fallback={profile.display_name || 'P'} size="xl" />}
        <div className="min-w-0 flex-1 basis-48"><h2 className="break-words text-xl font-bold">{profile.display_name || 'Player'}</h2>
          {profile.home_area && <p className="text-sm text-muted-foreground">{profile.home_area}</p>}
        </div>
        {profile.is_me && <Button variant="outline" onClick={()=>setEditing(true)}>Edit profile</Button>}
      </div>
      {profile.bio && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{profile.bio}</p>}
    </Card>
    <section className="space-y-3" aria-labelledby="my-sports-heading"><h2 id="my-sports-heading" className="text-lg font-bold">My sports</h2>
      {profile.sports.map(sport=><Card key={sport.sport} className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2"><span className="text-2xl" aria-hidden="true">{sport.emoji}</span><h3 className="font-bold">{sport.name}</h3>
          {sport.is_primary && <Badge>Primary</Badge>}{!sport.is_enabled && <Badge variant="secondary">Coming soon</Badge>}
        </div>
        <p className="text-sm capitalize">{sport.skill_level}</p>
        {sport.role_labels.length>0 && <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">{sport.role_label}</span>
          {sport.role_labels.map((label,index)=><Badge variant="outline" key={sport.roles[index] || label}>{label} · {index===0?'Main':index===1?'2nd':index+1}</Badge>)}
        </div>}
        <p className="text-sm text-muted-foreground">{sport.games_played} games played{profile.is_me && sport.upcoming_games!==null?' · '+sport.upcoming_games+' upcoming':''}</p>
      </Card>)}
    </section>
    {profile.is_me && <Card className="space-y-2 p-4 sm:p-6"><h2 className="text-lg font-bold">Your ratings</h2>
      <p className="text-sm">{profile.my_rating?.count && profile.my_rating.average!==null?'⭐ '+profile.my_rating.average.toFixed(1)+' from '+profile.my_rating.count+' ratings':'No ratings yet'}</p>
      <p className="text-xs text-muted-foreground">Your ratings are private and only visible to you.</p>
    </Card>}
  </div>;
}
