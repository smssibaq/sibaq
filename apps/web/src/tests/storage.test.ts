import { describe, it, expect } from 'vitest';
import { validateStorageFile, STORAGE_CONFIG } from '../lib/supabase/storage';

describe('Storage Helpers & Validation', () => {
  it('validates file size limit against 5MB threshold', () => {
    // 6MB dummy file
    const oversized = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf',
    });
    const result = validateStorageFile(oversized);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds the allowed limit');
  });

  it('rejects disallowed MIME types', () => {
    const invalidMime = new File(['binary'], 'virus.exe', {
      type: 'application/x-msdownload',
    });
    const result = validateStorageFile(invalidMime);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not supported');
  });

  it('accepts allowed MIME types within size limit', () => {
    const validImage = new File(['img_bytes'], 'photo.png', {
      type: 'image/png',
    });
    const result = validateStorageFile(validImage);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('verifies storage configuration constants', () => {
    expect(STORAGE_CONFIG.bucket).toBe('user-files');
    expect(STORAGE_CONFIG.maxSizeBytes).toBe(5 * 1024 * 1024);
    expect(STORAGE_CONFIG.signedUrlExpirySeconds).toBe(300);
  });

  it('rejects avatar images exceeding 2MB limit', async () => {
    const { uploadAvatarImage } = await import('../lib/supabase/storage');
    const largeAvatar = new File([new ArrayBuffer(3 * 1024 * 1024)], 'huge-avatar.png', {
      type: 'image/png',
    });
    await expect(uploadAvatarImage(largeAvatar)).rejects.toThrow('Image must be smaller than 2 MB.');
  });

  it('rejects unsupported avatar file types like GIF or PDF', async () => {
    const { uploadAvatarImage } = await import('../lib/supabase/storage');
    const gifFile = new File(['dummy_gif'], 'avatar.gif', {
      type: 'image/gif',
    });
    await expect(uploadAvatarImage(gifFile)).rejects.toThrow('Only JPG, PNG and WebP images are allowed.');
  });
});

