import { z } from 'zod'

export const settingsSchema = z.object({
  whatsappCtaUrl: z.string().trim().url('Please enter a valid URL').optional(),
  logoUrl: z.string().trim().url().optional(),
  logoStoragePath: z.string().trim().optional(),
})

export type SettingsFormData = z.infer<typeof settingsSchema>
