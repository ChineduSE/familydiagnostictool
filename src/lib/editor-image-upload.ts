import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_BYTES = 5 * 1024 * 1024
const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

// Validates an image and uploads it to the existing public `logos` bucket under a
// `broadcast/` prefix, returning the public URL for embedding in a broadcast.
export async function uploadEditorImage(supabase: SupabaseClient, file: File): Promise<string> {
  const ext = EXT[file.type]
  if (!ext) throw new Error('Please choose a PNG, JPG, GIF or WebP image.')
  if (file.size > MAX_BYTES) throw new Error('Image must be under 5MB.')

  const path = `broadcast/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('logos').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return data.publicUrl
}
