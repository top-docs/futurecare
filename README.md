# Top Docs

Top Docs helps patients book an online consultation with a specialist trained at institutes such as AIIMS, PGIMER, Tata Memorial, JIPMER, and CMC Vellore. The Build Week V1 uses a guided form: the patient chooses the consultation type and specialty, shares the case details, reviews a fixed approved doctor, enters a name and Indian WhatsApp number, and pays through Razorpay. The care team then confirms the consultation manually on WhatsApp.

## Current V1

The V1 includes a trust-first landing page, routing across ten specialties, care-team review for unsupported cases, approved doctor profiles, Razorpay checkout, funnel events, and saved-session recovery.

There is no AI chatbot and no website report upload in V1. After payment, the care team asks for relevant reports privately on WhatsApp.

## Safety boundary

The website is an intake and coordination tool. It does not diagnose, recommend treatment or medicine, interpret reports, or issue prescriptions. Possible emergencies should go to the nearest hospital.

## Local setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env.local` and add the required private values. Leave `RAZORPAY_LIVE_ENABLED=false` while using Razorpay test keys.
3. Run Convex with `npx convex dev`.
4. Run the website with `npm run dev`.

Never commit patient chats, medical reports, prescriptions, meeting links, or API secrets.

## Launch gates

- Keep health details and contact information in Convex only. Do not put them in browser storage, analytics, logs, screenshots, or Git.
- Keep reports off the website; collect them privately on WhatsApp after payment.
- Test the complete flow with Razorpay test keys first. Live payments remain blocked unless `RAZORPAY_LIVE_ENABLED=true` and live Razorpay keys are configured.
- Set `PAYMENT_API_SECRET_HASH` in Convex to the SHA-256 hash of the Razorpay key secret used by the server.
- Do not enable live payments until the doctor roster and public credentials have been reviewed and the clinical or legal launch review is complete.

## Checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The product scope is controlled by [IDEA_SCOPE.md](./IDEA_SCOPE.md).
