import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/modules/auth/auth-provider';
import { useToast } from '@/components/ui/toast';
import { makeProfileDraft, profileApi, profileErrorMessage, refreshPlayerPhotos, useSportsCatalog, validateAbout } from './api';

export function useProfileEditor() {
  const {profile,user,refreshProfile}=useAuth();
  const [draft,setDraft]=useState(()=>makeProfileDraft(profile,user?.user_metadata?.display_name || user?.user_metadata?.full_name || ''));
  const [uploading,setUploading]=useState(false);
  const catalog=useSportsCatalog();
  const {toast}=useToast();
  const queryClient=useQueryClient();
  const mutation=useMutation({
    mutationFn:()=>profileApi.save(draft),
    onSuccess:async()=>{await refreshProfile();void refreshPlayerPhotos(queryClient);toast.success('Profile saved');},
    onError:error=>toast.error('Could not save profile',profileErrorMessage(error)),
  });
  async function save():Promise<boolean> {
    const aboutError=validateAbout(draft);
    if(aboutError){toast.error('Check your details',aboutError);return false;}
    if(!draft.sports.length){toast.error('Choose your sports','Pick at least one sport');return false;}
    if(!catalog.data?.length){toast.error('Sports unavailable','Please reload the sports catalog before saving.');return false;}
    if(uploading || mutation.isPending)return false;
    try{await mutation.mutateAsync();return true;}catch{return false;}
  }
  return {draft,setDraft,catalog,save,busy:uploading || mutation.isPending,setUploading};
}
