import { z } from "zod";

export const contactSchema = z.object({
  patientName: z.string().trim().min(2, "Enter the patient’s full name."),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
  email: z.string().trim().email("Enter a valid email address."),
});

export type ContactDetails = z.infer<typeof contactSchema>;

