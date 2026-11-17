import { useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { ImageUploader } from '@/components/common/image-uploader';
import { removeSquadImage, setSquadImage } from '@/lib/supabase/image-upload';
import { squadImageKey, useSquadImage } from './use-squad-image';

/** Upload / change / remove the squad logo. Only render editable controls for owners and admins. */
export function SquadLogoUploader({ squadId, canEdit }: { squadId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data: url } = useSquadImage(squadId);
  const refresh = () => queryClient.invalidateQueries({ queryKey: squadImageKey(squadId) });
  return (
    <ImageUploader
      shape="rounded"
      noun="logo"
      currentUrl={url}
      canEdit={canEdit}
      fallback={<Shield className="h-10 w-10" />}
      onUpload={async (image) => {
        await setSquadImage(squadId, image);
        await refresh();
      }}
      onRemove={async () => {
        await removeSquadImage(squadId);
        await refresh();
      }}
    />
  );
}
