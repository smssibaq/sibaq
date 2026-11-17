import { supabase, isSupabaseConfigured } from './client';

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const OUTPUT_SIZE = 512;

export const AVATAR_BUCKET = 'avatars';
export const SQUAD_IMAGE_BUCKET = 'squad-images';

export interface PreparedImage {
  blob: Blob;
  contentType: string;
  ext: 'webp' | 'jpg';
  previewUrl: string;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateImageFile(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Only JPG, PNG and WebP images are allowed.';
  if (file.size > IMAGE_MAX_BYTES) return 'Image must be smaller than 2 MB.';
  return null;
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(file);
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not read this image.'));
    img.src = url;
  });
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

/** Validates, centre-crops to a square and compresses to WebP (JPEG fallback). */
export async function prepareSquareImage(file: File): Promise<PreparedImage> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);

  const decoded = await decode(file).catch(() => {
    throw new Error('Could not read this image. Try another file.');
  });
  try {
    const side = Math.min(decoded.width, decoded.height);
    const out = Math.min(OUTPUT_SIZE, side);
    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is not supported in this browser.');
    ctx.drawImage(
      decoded.source,
      (decoded.width - side) / 2,
      (decoded.height - side) / 2,
      side,
      side,
      0,
      0,
      out,
      out
    );
    const toBlob = (type: string, q: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
    let blob = await toBlob('image/webp', 0.86);
    let contentType = 'image/webp';
    let ext: 'webp' | 'jpg' = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlob('image/jpeg', 0.86);
      contentType = 'image/jpeg';
      ext = 'jpg';
    }
    if (!blob) throw new Error('Could not process this image.');
    return { blob, contentType, ext, previewUrl: URL.createObjectURL(blob) };
  } finally {
    decoded.close();
  }
}

/** Object path inside a public bucket for a URL produced by getPublicUrl, else null. */
export function storagePathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
}

export function imageErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : '';
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  if (/row-level security|42501|forbidden|not authorized|unauthorized/i.test(`${raw} ${code}`)) {
    return "You don't have permission to change this image.";
  }
  if (/bucket not found/i.test(raw)) return 'Image storage is not set up yet. Ask an admin to run the storage SQL.';
  if (/set_squad_image|image_url|schema cache|42703|42883/i.test(`${raw} ${code}`)) {
    return 'Squad images are not enabled yet. Ask an admin to run the squad image SQL.';
  }
  return raw || 'Something went wrong. Please try again.';
}

function requireClient() {
  if (!isSupabaseConfigured) throw new Error('Uploads need a live Supabase connection.');
}

async function removeObjectQuietly(bucket: string, path: string | null) {
  if (!path) return;
  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    /* best effort: an orphaned file is harmless, a failed save is not */
  }
}

/* ------------------------------ Profile avatar ------------------------------ */

export async function setMyAvatar(image: PreparedImage): Promise<string> {
  requireClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error('Please log in to change your photo.');

  const { data: current } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
  const previousPath = storagePathFromPublicUrl(current?.avatar_url, AVATAR_BUCKET);

  const path = `${user.id}/avatar-${crypto.randomUUID()}.${image.ext}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, image.blob, { contentType: image.contentType, upsert: false, cacheControl: '31536000' });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const { error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (dbError) {
    await removeObjectQuietly(AVATAR_BUCKET, path); // keep the previous image intact
    throw dbError;
  }

  // Only ever delete the user's own previous avatar.
  if (previousPath && previousPath.startsWith(`${user.id}/`) && previousPath !== path) {
    await removeObjectQuietly(AVATAR_BUCKET, previousPath);
  }
  return data.publicUrl;
}

export async function removeMyAvatar(): Promise<void> {
  requireClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error('Please log in to change your photo.');

  const { data: current } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
  const previousPath = storagePathFromPublicUrl(current?.avatar_url, AVATAR_BUCKET);

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) throw error;
  if (previousPath && previousPath.startsWith(`${user.id}/`)) {
    await removeObjectQuietly(AVATAR_BUCKET, previousPath);
  }
}

/* ------------------------------- Squad image -------------------------------- */

export async function setSquadImage(squadId: string, image: PreparedImage): Promise<string> {
  requireClient();
  const { data: current } = await supabase.from('squads').select('image_url').eq('id', squadId).maybeSingle();
  const previousPath = storagePathFromPublicUrl(current?.image_url, SQUAD_IMAGE_BUCKET);

  const path = `squads/${squadId}/${crypto.randomUUID()}.${image.ext}`;
  const { error: uploadError } = await supabase.storage
    .from(SQUAD_IMAGE_BUCKET)
    .upload(path, image.blob, { contentType: image.contentType, upsert: false, cacheControl: '31536000' });
  if (uploadError) throw uploadError; // storage policy rejects non owner/admin here

  const { data } = supabase.storage.from(SQUAD_IMAGE_BUCKET).getPublicUrl(path);
  const { error: dbError } = await supabase.rpc('set_squad_image', { p_squad: squadId, p_image_url: data.publicUrl });
  if (dbError) {
    await removeObjectQuietly(SQUAD_IMAGE_BUCKET, path);
    throw dbError;
  }

  // Only delete files from this same squad's folder.
  if (previousPath && previousPath.startsWith(`squads/${squadId}/`) && previousPath !== path) {
    await removeObjectQuietly(SQUAD_IMAGE_BUCKET, previousPath);
  }
  return data.publicUrl;
}

export async function removeSquadImage(squadId: string): Promise<void> {
  requireClient();
  const { data: current } = await supabase.from('squads').select('image_url').eq('id', squadId).maybeSingle();
  const previousPath = storagePathFromPublicUrl(current?.image_url, SQUAD_IMAGE_BUCKET);

  const { error } = await supabase.rpc('set_squad_image', { p_squad: squadId, p_image_url: null });
  if (error) throw error;
  if (previousPath && previousPath.startsWith(`squads/${squadId}/`)) {
    await removeObjectQuietly(SQUAD_IMAGE_BUCKET, previousPath);
  }
}
