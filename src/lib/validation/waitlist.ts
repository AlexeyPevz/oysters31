import { z } from "zod"

export const waitlistUpdateSchema = z.object({
  notified: z.boolean(),
  note: z.string().max(280).optional(),
})

export type WaitlistUpdateInput = z.infer<typeof waitlistUpdateSchema>
