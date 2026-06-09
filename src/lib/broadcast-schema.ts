import { z } from 'zod'

export const audienceTypeEnum = z.enum(['all', 'at_risk', 'under_strain', 'strong', 'individuals'])

export const broadcastSchema = z
  .object({
    subject: z.string().trim().min(1, 'Please enter a subject line').max(150),
    bodyHtml: z.string().min(1, 'Please write your message before continuing'),
    ctaLabel: z.string().trim().max(100).optional(),
    ctaUrl: z.string().trim().url('Please enter a valid URL').optional(),
    includeLogo: z.boolean().default(false),
    audienceType: audienceTypeEnum,
    audienceIds: z.array(z.string().uuid()).optional(),
    scheduledAt: z.string().datetime().optional(),
  })
  .refine((data) => data.audienceType !== 'individuals' || (data.audienceIds?.length ?? 0) > 0, {
    message: 'Select at least one recipient',
    path: ['audienceIds'],
  })

export type BroadcastFormData = z.infer<typeof broadcastSchema>
