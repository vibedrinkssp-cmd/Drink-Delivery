import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const STORAGE_BUCKET = 'images';

export function getStorageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

export function getPublicUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'uploads'
): Promise<{ path: string; publicUrl: string }> {
  const uniqueFileName = `${folder}/${randomUUID()}-${fileName}`;
  
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(uniqueFileName, file, {
      contentType,
      upsert: false
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const publicUrl = getPublicUrl(data.path);
  
  return {
    path: data.path,
    publicUrl
  };
}

export async function deleteFile(path: string): Promise<void> {
  if (!path || path.startsWith('http')) {
    return;
  }
  
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) {
    console.error(`Failed to delete file: ${error.message}`);
  }
}

export async function createSignedUploadUrl(folder: string = 'uploads'): Promise<{
  signedUrl: string;
  path: string;
  token: string;
}> {
  const fileName = `${folder}/${randomUUID()}`;
  
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(fileName);

  if (error) {
    throw new Error(`Failed to create signed upload URL: ${error.message}`);
  }

  return {
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token
  };
}
