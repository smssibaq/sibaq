import { ImageUploader } from '@/components/common/image-uploader';
import { removeMyAvatar, setMyAvatar } from '@/lib/supabase/image-upload';
import { useAuth } from '@/modules/auth/auth-provider';

/** Upload / change / remove the signed-in user's profile photo. */
export function AvatarUploader() {
  const { profile, refreshProfile } = useAuth();
  const initials = (profile?.display_name || 'P').trim().slice(0, 2).toUpperCase();
  return (
    <ImageUploader
      shape="circle"
      noun="photo"
      canEdit
      currentUrl={profile?.avatar_url}
      fallback={<span>{initials}</span>}
      onUpload={async (image) => {
        await setMyAvatar(image);
        await refreshProfile();
      }}
      onRemove={async () => {
        await removeMyAvatar();
        await refreshProfile();
      }}
    />
  );
}
