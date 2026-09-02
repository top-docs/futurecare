import { z } from "zod";

export const guidedContactSchema = z.object({
  patientName: z.string().trim().min(2, "Enter the patient’s full name."),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
});

export type GuidedContactDetails = z.infer<typeof guidedContactSchema>;
