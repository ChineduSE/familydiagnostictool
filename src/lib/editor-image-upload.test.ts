/* eslint-disable @typescript-eslint/no-explicit-any -- loose test doubles */
import { describe, it, expect, vi } from 'vitest'
import { uploadEditorImage } from '@/lib/editor-image-upload'

function fakeSupabase({ uploadError = null as null | { message: string } } = {}) {
  const upload = vi.fn(async () => ({ error: uploadError }))
  return {
    upload,
    storage: {
      from: () => ({ upload, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn/${p}` } }) }),
    },
  } as any
}

function fakeFile(type: string, size: number) {
  return { type, size } as File
}

describe('uploadEditorImage', () => {
  it('rejects an unsupported file type', async () => {
    await expect(uploadEditorImage(fakeSupabase(), fakeFile('image/svg+xml', 100))).rejects.toThrow()
  })

  it('rejects a file over 5MB', async () => {
    await expect(uploadEditorImage(fakeSupabase(), fakeFile('image/png', 6 * 1024 * 1024))).rejects.toThrow()
  })

  it('uploads under broadcast/ and returns the public url', async () => {
    const supabase = fakeSupabase()
    const url = await uploadEditorImage(supabase, fakeFile('image/png', 1000))
    expect(supabase.upload.mock.calls[0][0]).toMatch(/^broadcast\//)
    expect(url).toContain('https://cdn/broadcast/')
  })

  it('throws when storage upload fails', async () => {
    const supabase = fakeSupabase({ uploadError: { message: 'nope' } })
    await expect(uploadEditorImage(supabase, fakeFile('image/png', 1000))).rejects.toThrow('nope')
  })
})
