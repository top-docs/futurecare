# FutureCare

FutureCare is a Build Week V1 for specialist teleconsultations. A patient describes a concern, reviews one matched doctor, shares contact details, and completes a Razorpay test payment. The care team then schedules the consultation manually on WhatsApp within 24 hours.

## Current milestone

Milestone 1 is one hardcoded gynaecology journey with Dr. Kirti Sinha. The broader AI intake, ten-specialty routing, report upload, and production payments remain later milestones.

## Safety boundary

The assistant is an intake and coordination tool. It does not diagnose, recommend treatment or medicine, interpret reports, or issue prescriptions. Possible emergencies should go to the nearest hospital.

## Local setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env.local` and add the required private values.
3. Run Convex with `npx convex dev`.
4. Run the website with `npm run dev`.

Never commit patient chats, medical reports, prescriptions, meeting links, or API secrets.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

The product scope is controlled by [IDEA_SCOPE.md](./IDEA_SCOPE.md).
