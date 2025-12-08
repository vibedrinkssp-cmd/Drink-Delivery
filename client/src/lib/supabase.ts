import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const STORAGE_BUCKET = 'images';

export function getStorageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

export async function uploadImage(
  file: File,
  folder: string = 'uploads'
): Promise<{ path: string; publicUrl: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${crypto.randomUUID()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: urlData.publicUrl
  };
}

export async function deleteImage(path: string): Promise<void> {
  if (!path || path.startsWith('http')) {
    return;
  }
  
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([path]);

  if (error) {
    console.error(`Failed to delete image: ${error.message}`);
  }
}
