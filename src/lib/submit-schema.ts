import { z } from 'zod'
import { QUESTIONS } from '@/lib/questions'

export const submitSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  marketingConsent: z.boolean().default(false),
  answers: z.array(z.number().int().min(1).max(5)).length(QUESTIONS.length),
})
