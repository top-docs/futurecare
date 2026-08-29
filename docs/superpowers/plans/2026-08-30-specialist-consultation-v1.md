# FutureCare Specialist Consultation V1 Build Plan

> Plan status: approved choices recorded; application code has not started.

**Goal:** Ship a live mobile-first product where a patient describes a case, sees one approved specialist, pays through Razorpay test mode, and understands that the care team will arrange the consultation within 24 hours.

**Product authority:** `IDEA_SCOPE.md`. If this plan conflicts with that document, stop and resolve the conflict before building.

**Architecture:** A Next.js and TypeScript website opens directly into a chat. A server-side OpenAI assistant acts only as a front desk. Convex privately stores cases, reports, consent, payment state, and funnel events. Razorpay Checkout handles test payments. Vercel hosts the product. Scheduling, WhatsApp contact, Zoom, and the medical consultation remain manual.

## Locked build choices

These choices were stated or approved by the builder during planning:

- Working product and public repository name: `FutureCare` / `futurecare`.
- Frontend: Next.js with TypeScript.
- AI: OpenAI Responses API using `gpt-5-mini`.
- Language: the interface is English; the assistant understands and replies in English, Hindi, or Hinglish, matching the patient.
- Database: create a new Convex project.
- Payment: Razorpay Checkout in test mode. Real payments are not part of this build pass.
- First complete journey: gynaecology.
- Phone validation: Indian 10-digit mobile numbers only.
- Data retention: keep patient records and reports until deletion is requested.
- Deletion requests: `lokeshdange8@gmail.com`.
- Registration-number decision: the builder states that a clinical or legal review approved showing registration numbers during consultation and on prescriptions rather than before payment. Codex has not independently verified that review.
- Doctor-unavailable handling: intentionally ignored for V1 as an edge case; do not add an alternative-doctor flow.

## Build rules

- Build one milestone at a time. Do not begin the next milestone until the current one is verified.
- After every milestone, report: **what was built**, **how the builder can verify it**, **assumptions made**, and **pass/fail status**.
- Do not add features from `NICE TO HAVE` unless the builder separately approves them after all required milestones pass.
- Keep API keys only in local or Vercel environment settings. Commit only an `.env.example` containing variable names, never secret values.
- Never place private patient chats, reports, prescriptions, phone numbers, payment details, meeting links, or identifiable health information in the public repository, screenshots, tests, or demo data.
- Use fictional test patients in automated and manual tests.
- The AI is a front desk, not a doctor: no diagnosis, treatment advice, medicine recommendation, report interpretation, outcome promise, or prescription.
- Uploaded reports are stored for manual review and are never sent to OpenAI in V1.
- Use only approved doctor names, photos, specialties, qualifications, focus areas, and institute-training facts.
- Say `trained at` unless current employment is separately verified. Never claim a doctor is “the best.”

## Planned file structure

The repository is currently documentation-only. The build will add this structure as the milestones require it:

```text
app/
  api/
    assistant/route.ts
    payments/create/route.ts
    payments/verify/route.ts
  complete/page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  chat/
  consent/
  contact/
  doctor/
  payment/
  reports/
  trust/
convex/
  cases.ts
  events.ts
  files.ts
  payments.ts
  schema.ts
lib/
  assistant-policy.ts
  doctors.ts
  emergency.ts
  pricing.ts
  service-facts.ts
  specialties.ts
  validation.ts
public/
  doctors/
tests/
  e2e/
  unit/
.env.example
```

Exact component filenames may be split when a file becomes difficult to read, but the product behaviour must not change without approval.

## Build order mapped to milestones

| # | Milestone | What will be built | Verification gate | Layer |
|---:|---|---|---|---|
| 1 | - [x] **I can complete one rough gynaecology journey on the live site.** | Create the app, design tokens, one hardcoded chat path, Dr. Kirti Sinha’s approved card, case summary, guest contact form, one saved Convex case, Razorpay Checkout test payment, completion page, public GitHub repository, and Vercel deployment. This is deliberately rough but complete. | On a fresh mobile browser: describe the fictional gynaecology case → see Dr. Kirti Sinha → enter fictional contact details → finish Razorpay test payment → see the WhatsApp-within-24-hours completion message. Confirm one case and one payment state in Convex. | Frontend, Backend, Database, Integration |
| 2 | - [ ] **I can start safely without losing my input.** | Add required health-data consent, separate optional promotional consent, disabled Send for blank input, and specific errors for missing consent or blank text. | Type a message before consent, try to send it, then grant consent. The typed text remains and only one message is created. | Frontend |
| 3 | - [ ] **I can use the hardcoded journey without duplicate actions.** | Harden the doctor introduction, persistent `See a Doctor`, approved trust strip, ₹800 promise, AI boundary, and protection against repeated taps creating duplicate cards or cases. | Double-tap Send and `See a Doctor`; only one patient message, doctor card, and case appear. | Frontend, Backend |
| 4 | - [ ] **I can recover from unclear, urgent, or wrongly matched input.** | Add unclear-input retry, possible-emergency stop with nearest-hospital direction, and `This doesn’t look right` correction. | Test one nonsense message, one fictional emergency message, and one wrong-match correction. None reaches payment incorrectly. | Frontend, Backend |
| 5 | - [ ] **I can be matched across all ten approved specialties.** | Add the full hardcoded specialty roster and two oncology routes. Use a neutral initials placeholder for medical oncology and only approved facts on every card. | Run one fictional example per specialty. Each produces the agreed doctor; unmatched cancer cases become enquiries. | Frontend, Backend |
| 6 | - [ ] **I can submit usable contact details or an unsupported enquiry.** | Validate name, email, and Indian 10-digit phone number. Add the unsupported-case path that saves an enquiry and never opens payment. | Reject empty, malformed, and non-Indian phone inputs. Submit one valid supported case and one unsupported case; only the supported one can pay. | Frontend, Backend, Database |
| 7 | - [ ] **I can review and save an accurate handoff.** | Build the short case summary, complete Convex case record, consent timestamps, matched-doctor state, deletion-request link, and retention behaviour. | Compare the visible summary with the saved fictional chat. Confirm the deletion link uses `lokeshdange8@gmail.com` and records remain until deletion is requested. | Frontend, Backend, Database |
| 8 | - [ ] **I can speak naturally with the real assistant without receiving medical advice.** | Replace the hardcoded intake conversation with `gpt-5-mini`. Restrict it to approved service facts and roster data, one question at a time, specialty matching, case summary, and English/Hindi/Hinglish replies. Add timeout and retry states. | Test English, Hindi, and Hinglish inputs; a service question; a medicine request; an unknown fact; and a forced API failure. The assistant matches language, refuses medical advice, admits unknowns, and lets the patient retry. | Frontend, Backend, Integration |
| 9 | - [ ] **I can upload reports without the AI reading them.** | Add private PDF/JPG/PNG uploads to Convex storage, up to seven files and 10 MB each, with per-file progress, validation, failure, remove, and retry states. | Upload valid files, an eighth file, an oversized file, a wrong type, and one simulated failed upload. Valid files remain; errors do not reset the case. Confirm files are never included in OpenAI requests. | Frontend, Backend, Database, Integration |
| 10 | - [ ] **I can pay once and recover safely from payment problems.** | Harden date-based pricing, Razorpay order creation and server-side verification, cancellation, failure, retry, double-tap protection, and payment-status recovery when the return page is missed. | Complete one success, one cancellation, one failed attempt, one double-tap, and one reopened-session status check in Razorpay test mode. No case is erased and no duplicate order is offered as a completed payment. | Frontend, Backend, Database, Integration |
| 11 | - [ ] **I can see the complete funnel once, with no duplicate events.** | Record visit, chat started, doctor shown, `See a Doctor`, contact submitted, payment started, payment result, test revenue, unsupported enquiry, source, and self-serve/support-assisted state. | Complete one supported and one unsupported fictional flow. Inspect Convex and confirm each expected event appears once with the correct case. | Frontend, Backend, Database |
| 12 | - [ ] **I can finish the required paths on the public build without exposing private data.** | Run responsive and accessibility checks, verify mobile and desktop layouts, add loading/error/empty/success states, scan the public repository for secrets and private evidence, and verify Vercel environment settings. | Finish supported, emergency, unsupported, failed-payment, and successful-payment paths on the live Vercel URL. Inspect the public repository and confirm it contains no secrets or patient evidence. | Frontend, Backend, Database, Integration |
| 13 | - [ ] **I can close and reopen the product without losing or duplicating the case.** | Store a non-secret session identifier in the browser and restore the matching Convex record, chat, summary, reports, consent, contact, doctor, payment state, and funnel history. | Start a fictional case, close the browser, reopen the live URL, and continue the same case. Convex contains one case and one copy of each event. | Frontend, Backend, Database, Integration |

## Milestone 1 implementation sequence

Milestone 1 is the first coding pass after this plan is approved:

1. Check local Node, npm, GitHub, Vercel, and Convex access without changing anything.
2. Create the `futurecare` Next.js and TypeScript app and a secret-safe `.gitignore` / `.env.example`.
3. Create the new Convex project and the minimum case/payment schema.
4. Build the rough mobile chat screen using the approved interface system in `.interface-design/system.md`.
5. Hardcode one fictional gynaecology conversation and show Dr. Kirti Sinha’s approved profile.
6. Add the summary and guest contact step using fictional test data only.
7. Connect Razorpay Checkout with test credentials and server-side payment verification.
8. Add the completion page with the manual WhatsApp scheduling message.
9. Run local checks and complete the full path in a browser.
10. Create the public GitHub repository, perform a privacy scan, deploy to Vercel, and repeat the full path on the live URL.
11. Stop and give the milestone report before starting Milestone 2.

## What is intentionally outside this build

- No login, OTP, patient portal, consultation history, appointments tab, or prescription library.
- No doctor directory, comparison, ranking, or patient-selected doctor list.
- No automatic appointment calendar, WhatsApp messages, Zoom creation, or in-app video.
- No AI report reading, diagnosis, treatment, medicine recommendations, or prescriptions.
- No named-doctor monitoring inside the AI chat.
- No guaranteed prescription, multidisciplinary review, insurance, subscription, or automated refund.
- No admin dashboard; Build Week operations use Convex directly.
- No medical blogs, unapproved testimonials, unapproved doctor facts, or filler marketing sections.
- No doctor-unavailable or alternative-doctor flow in V1.

## Final completion report

After Milestone 13, report:

- Which milestones pass on the live Vercel build.
- Which checks fail or remain unverified.
- The exact test paths completed.
- Whether the public repository privacy scan passes.
- What the builder should test first using a real phone.
- Any remaining launch risks, without claiming they are resolved unless they were actually verified.
