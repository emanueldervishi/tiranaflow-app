import { supabase } from "@/lib/supabase";

export const uploadToBucket = async (
  bucket: string,
  path: string,
  payload: ArrayBuffer,
  contentType: string,
) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.storage.from(bucket).upload(path, payload, {
    contentType,
    upsert: true,
  });

  if (error) throw error;
  return path;
};

export const createSignedImageUrl = async (bucket: string, path: string | null) => {
  if (!supabase || !path) return null;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) return null;
  return data.signedUrl;
};
