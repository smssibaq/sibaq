import { supabase, isSupabaseConfigured } from './client';
import { normalizeError, AppError } from '../errors';

export const STORAGE_CONFIG = {
  bucket: 'user-files',
  maxSizeBytes: 5 * 1024 * 1024, // 5MB limit
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
  ],
  signedUrlExpirySeconds: 300, // 5 minutes
} as const;

export interface UploadOptions {
  userId: string;
  file: File;
  prefix?: string;
}

export interface UploadResult {
  path: string;
  signedUrl?: string;
}

/**
 * Validates a file against allowed size and MIME constraints.
 */
export function validateStorageFile(file: File): { valid: boolean; error?: string } {
  if (file.size > STORAGE_CONFIG.maxSizeBytes) {
    const maxMb = STORAGE_CONFIG.maxSizeBytes / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds the allowed limit of ${maxMb}MB.`,
    };
  }

  if (!STORAGE_CONFIG.allowedMimeTypes.includes(file.type as never)) {
    return {
      valid: false,
      error: `File type "${file.type || 'unknown'}" is not supported. Allowed: images, PDF, plain text.`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a file under the authenticated user's isolated folder: `<userId>/<uuid>.<ext>`.
 */
export async function uploadUserFile({
  userId,
  file,
  prefix = 'uploads',
}: UploadOptions): Promise<UploadResult> {
  if (!isSupabaseConfigured) {
    throw new AppError(
      'Storage is unavailable because Supabase is not configured with live credentials.',
      'CONFIG_MISSING'
    );
  }

  const validation = validateStorageFile(file);
  if (!validation.valid) {
    throw new AppError(validation.error || 'Invalid file', 'VALIDATION_FAILED');
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
  const randomId = crypto.randomUUID();
  const fileName = ext ? `${randomId}.${ext}` : randomId;
  const objectPath = `${userId}/${prefix}/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.bucket)
      .upload(objectPath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw normalizeError(error);
    }

    // Generate signed URL
    const signedUrl = await getSignedFileUrl(data.path);

    return {
      path: data.path,
      signedUrl,
    };
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * Generates a short-lived signed URL for a file in the user-files bucket.
 */
export async function getSignedFileUrl(
  path: string,
  expiresInSeconds = STORAGE_CONFIG.signedUrlExpirySeconds
): Promise<string> {
  if (!isSupabaseConfigured) {
    return '';
  }

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      throw normalizeError(error);
    }

    return data.signedUrl;
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * Deletes a file from the user-files bucket.
 */
export async function deleteUserFile(path: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  try {
    const { error } = await supabase.storage
      .from(STORAGE_CONFIG.bucket)
      .remove([path]);

    if (error) {
      throw normalizeError(error);
    }
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * Validates an avatar image file against allowed size and format constraints.
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
    return {
      valid: false,
      error: 'Only JPG, PNG and WebP images are allowed.',
    };
  }

  if (file.size > 2 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Image must be smaller than 2 MB.',
    };
  }

  return { valid: true };
}

/**
 * Uploads a profile avatar image to the 'avatars' bucket under '{authenticated_user_id}/{filename}',
 * updates public.profiles with the new avatar_url, and returns the public URL.
 */
export async function uploadAvatarImage(file: File): Promise<string> {
  const validation = validateAvatarFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (!isSupabaseConfigured) {
    return URL.createObjectURL(file);
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Please log in to upload a profile image.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  const filePath = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      avatar_url: data.publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profileError) {
    throw profileError;
  }

  return data.publicUrl;
}


