import { z } from 'zod'
import { QUESTIONS } from '@/lib/questions'

export const submitSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  // Opt-out model: completing the quiz subscribes the parent. Kept in the schema
  // for record-keeping; defaults true if the client omits it.
  marketingConsent: z.boolean().default(true),
  answers: z.array(z.number().int().min(1).max(5)).length(QUESTIONS.length),
  // Q17 readiness router (unscored): true = "yes, I'd welcome guided support".
  wantsSupport: z.boolean(),
})
