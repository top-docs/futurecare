# IDEA_SCOPE

This is the public control document for Build Week. The product has no public name yet, so this document calls it “the product.” Private patient chats, reports, prescriptions, payment details, meeting links, and identifiable medical information must never enter the public repository, screenshots, or demo.

## 1. USER — specific person

Aditya is a 30-year-old working professional living in a tier 1 or tier 2 Indian city. He is arranging specialist care for his mother while managing a full-time job. His local doctors have given conflicting treatment recommendations, and he wants a credible specialist to help the family understand the next step without travelling to a major medical institute or waiting through a long appointment queue.

Aditya represents both patients and caregivers who:

- need a first specialist consultation for a new symptom or diagnosis; or
- already have advice, reports, or a proposed treatment and want a second opinion.

They care about recognised specialist training, convenience, privacy, a clear process, and knowing who will actually conduct the consultation. They are not looking for a large directory to browse.

**Core action:** The patient describes their symptoms, diagnosis, or health concern → sees one matched specialist from the approved roster → pays ₹800 for a consultation arranged within 24 hours.

**Stated by the builder:** Seventeen active doctors are available across ten top-level specialties. Sixteen have approved photos; the medical-oncology profile uses a neutral initials placeholder until a clear approved photo is available. Permission exists to use their approved names, credentials, available photos, and relevant institute logos.

**Observed in the private pilot:** Patients have sought both first consultations and second opinions. They ask about the doctor’s background, availability, reports, price, process, prescription, and what happens after payment. The existing manual process can fulfil consultations.

**Inference to test:** A person who does not already know the builder will trust an AI-led intake and the displayed doctor evidence enough to pay through the product without first needing a personal call.

## 2. PROBLEM — what's broken in their day

The painful moment happens after a symptom, diagnosis, scan, or conflicting medical recommendation leaves the patient or family unsure what to do next. They may be at home after a hospital visit, comparing notes, searching online, messaging friends for introductions, or trying to reach a doctor from a leading institute.

What is broken:

- Finding the right specialist depends on personal contacts, repeated calls, hospital travel, or long queues.
- A list of doctors creates more work because the patient may not know which specialty or doctor fits the case.
- Credentials are often presented unclearly. “Trained at an institute” can be mistaken for “currently works at that institute.”
- The current manual process requires a person to collect the case, ask for reports, introduce a doctor, explain the price, collect payment, and coordinate the call.
- Patients can lose confidence when the next step, total price, doctor identity, or consultation timing is unclear.
- Emergency cases can be harmed if an online booking flow delays urgent in-person care.

The product must not solve this by pretending the AI is a doctor. The AI is a front desk for intake, service questions, case organisation, and approved doctor matching. Only the consulting doctor provides medical advice, decides whether teleconsultation is suitable, and issues a prescription when clinically appropriate.

The one outcome V1 must deliver is: a suitable patient can move from an unstructured health concern to a paid consultation with a clearly identified specialist, without the builder explaining the process live.

## 3. WHAT V1 DOES — full user flow, step by step

1. **Open directly into the chat.** The mobile-first hero is the working chat, not a marketing banner. The input placeholder reads: “Tell us about your symptoms, diagnosis, or health concern.” Send stays disabled while the field is empty.

2. **Offer five optional quick prompts.** The opening prompts are `Women’s health`, `Heart concerns`, `Stomach or digestive issues`, `Bone or joint problems`, and `Cancer second opinion`. Free text remains the main input.

3. **Collect consent before the first message.** The patient must accept a short notice allowing the product to store their health details and reports and share them with the matched doctor and the care team. Promotional WhatsApp consent is a separate optional choice.

4. **Check for possible emergencies.** If the message suggests a possible emergency, the normal booking flow pauses and tells the person to contact emergency services or go to the nearest hospital. The product does not offer a within-24-hours consultation as a substitute for urgent care.

5. **Run an adaptive intake.** The `24/7 AI Health Assistant` asks one relevant question at a time about the symptoms, diagnosis, existing advice, and purpose of the consultation. There is no fixed four-question limit; a case may need a longer conversation. Unclear or unrelated input triggers a request for clearer case details rather than a guessed answer.

6. **Keep the AI inside a strict boundary.** It may answer approved questions about the product, consultation process, price, reports, and doctor profiles. It must say when it does not know. It does not diagnose, recommend medicines or treatment, interpret test results, promise an outcome, or issue a prescription.

7. **Accept optional reports without AI interpretation.** V1 accepts PDF, JPG, and PNG files, up to seven files per case and 10 MB per file. The files are stored for manual review; the AI does not read or summarise them. If one file type, size, or upload fails, the successful files remain and only the failed file shows an error and retry action. Because V1 does not read the reports, blur is found during manual review and the care team requests a clearer copy later.

8. **Identify a supported specialty.** V1 covers ten top-level specialties: gynaecology, gastroenterology, cardiology, nephrology, oncology, orthopaedics, neonatology, neurology, endocrinology, and urology. Oncology has two approved routes: head and neck cancer maps to the head and neck surgical oncologist; cases appropriate for medical oncology map to the medical oncologist. Other cancer cases use the unsupported-case enquiry when neither profile fits.

9. **Recommend one doctor.** The assistant uses only approved specialty and focus-area data from the launch roster. It presents one doctor rather than ranking several or making a claim about clinical superiority. If the patient selects `This doesn’t look right`, the chat asks for clarification and tries the routing again. Repeated taps open only one doctor card while the action is loading.

10. **Show the doctor inside the conversation.** The card uses the approved photo, name, specialty, qualifications, institute training, relevant focus areas, ₹800 price, and consultation-within-24-hours expectation. The medical-oncology card uses a neutral initials placeholder until a clear approved photo is available; V1 never displays a blurry doctor image. It says `trained at` unless a current workplace is separately verified. It never says a doctor is “the best.” A persistent `See a Doctor` action remains available while the patient continues chatting.

11. **Build trust below the chat.** The page includes:

    - institute logos that are backed by at least one approved active profile;
    - the line `Institution logos indicate doctors’ training backgrounds, not hospital association or endorsement`;
    - `Manually verified doctor profiles`;
    - `Credentials reviewed before listing`;
    - `Built by doctors`;
    - `Private and shared only for your consultation`;
    - `Records shared only for the consultation`;
    - `Consultation arranged within 24 hours`;
    - a compact price breakdown for free intake, summary, matching, report upload, and the paid consultation;
    - five or six approved featured doctors as network proof, not as a second booking path; and
    - approved text testimonials, with video used only when it is already recorded and explicitly consented; and
    - one motion-based human handoff scene showing an approved doctor in a consultation frame while illustrative Indian patient portraits enter from either side. Generated patient portraits are visual examples, not real patients or testimonials.

    Motion is brief and purposeful, never an endless floating effect, and becomes a static composition when reduced motion is enabled. The page avoids generic AI claims, decorative feature filler, repeated trust badges, and invented statistics.

12. **Create a case summary.** The assistant produces a short summary for the patient and care team. If the conversation contains separate patient cases, it keeps separate summaries instead of combining them.

13. **Handle unsupported or uncertain cases without charging.** The product collects the person’s name, phone number, email, and enquiry, then promises a response within 24 hours. It does not show an invented doctor or take payment.

14. **Collect contact details before payment.** A supported patient continues as a guest and provides name, phone number, and email. There is no account or login. A secondary WhatsApp help action may appear after the doctor introduction, but it is not the main path.

15. **Take payment through Razorpay.** The doctor profile, ₹800 price, and post-payment process appear before payment. The Build Week introductory price is ₹800 through 5 September 2026; the standard price is ₹1,500 from 6 September 2026. There is no fake countdown. The button prevents duplicate payment attempts.

16. **Recover safely from payment problems.** If payment fails or the patient closes Razorpay, the case remains saved and the patient can retry without repeating the chat. If the confirmation page fails after payment, the product checks Razorpay’s status before offering another attempt, reducing the risk of a duplicate charge.

17. **Confirm the manual next step.** After successful payment, the screen says: “Payment received. Our care team will contact you on WhatsApp shortly to schedule your consultation within 24 hours.” The care team manually agrees on a time and sends the Zoom link.

18. **Complete the clinical handoff.** The registered doctor conducts the consultation and decides what advice or prescription is clinically appropriate. For V1, the builder has decided that the doctor’s registration number will be shared during the consultation and shown on any prescription the doctor issues, but not on the public landing page or before payment.

    **Unresolved launch risk:** This choice may not meet the National Medical Commission guidance stating that telemedicine platforms must provide listed doctors’ names, qualifications, and registration numbers. It must not be described as confirmed compliant. The decision needs a clinical or legal compliance review before public launch. Source: [National Medical Commission telemedicine guidance](https://www.nmc.org.in/wp-content/uploads/2019/10/Public_Notice_for_TMG_Website_Notice-merged.pdf).

19. **Save the complete operational record privately in Convex.** Save the full chat, case summary, uploaded reports, contact details, consent records, matched doctor, payment status, timestamps, and traffic source. The builder reviews cases through the Convex dashboard; V1 has no separate admin page. Patients can request deletion through the care team.

20. **Measure the whole funnel.** Record visit, chat started, doctor shown, `See a Doctor` selected, contact submitted, payment started, payment completed, revenue, unsupported enquiry, and traffic source. Mark payments as self-serve or support-assisted. Saturday reporting uses actual counts, not invented targets.

21. **Ship the smallest complete version first.** The first milestone is one ugly, hardcoded, complete supported journey deployed to Vercel and pushed to a public GitHub repository. It must reach Razorpay confirmation and explain manual WhatsApp scheduling. No private patient evidence, reports, prescriptions, payment secrets, or meeting links may enter that repository.

**Build Week control points:**

- **Saturday, 29 August — scope lock.** Acceptance: this document is approved and the ten-specialty mapping is checked. If behind: keep the agreed default mapping and defer all six alternative doctor profiles.
- **Sunday, 30 August — complete live flow.** Acceptance: a fresh mobile browser can finish a supported path, a failed-payment path, and an unsupported enquiry on Vercel; the repository is public. If behind: keep the ten hardcoded specialty routes and Razorpay test mode, but remove animations, featured-doctor browsing, and testimonials.
- **Monday, 31 August — three observed users.** Acceptance: three sessions record the first stop point without the builder explaining the interface. If behind: run one live session and collect two recorded walkthroughs.
- **Tuesday, 1 September — distribution.** Acceptance: the live link is shared on Instagram, X/Twitter, and selected WhatsApp communities or direct messages, with sources tracked. If behind: send ten direct WhatsApp invitations and publish one Instagram story.
- **Wednesday, 2 September to Friday, 4 September — blocker loop.** Acceptance: each day names the biggest blocker, ships one change, verifies it live, and records fresh user evidence. If behind: ship one change across the three days, choosing the blocker closest to payment.
- **Saturday, 5 September — verify and submit.** Acceptance: mobile flow, payment, public repository, screenshots, real numbers, and submitted links are verified before 11:00 AM IST; the demo path is ready by 3:00 PM. If behind: freeze changes at 8:00 AM and submit the last verified version.

The primary Build Week track is Revenue. The AI-assisted intake and routing are a cross-track bonus, not a reason to delay the paid end-to-end flow.

## 4. WHAT V1 DOES NOT DO — everything parked

- No login, OTP authentication, passwords, or patient accounts.
- No side panel with `New Chat`, `Health Record`, `Appointments`, or `Prescriptions` tabs.
- No patient portal, consultation history, or prescription library.
- No browsable doctor directory, doctor comparison, quality ranking, or patient-selected doctor list.
- No automatic calendar slots or exact appointment-time promise before payment.
- No automatic WhatsApp messages, Zoom creation, doctor coordination, or in-app video calls.
- No AI reading, extraction, summary, or interpretation of uploaded reports.
- No AI diagnosis, medical counselling, medicine suggestion, treatment plan, prescription, or ongoing monitoring.
- No claim that a chat is monitored by a named doctor and no doctor replying inside the AI chat.
- No guarantee that every consultation produces a prescription; that decision belongs to the doctor.
- No multidisciplinary or multi-doctor consultation flow.
- No automatic support for specialties outside the approved launch roster.
- No separate admin dashboard; operations use Convex during Build Week.
- No automated refunds, insurance, subscriptions, follow-up plans, or care packages.
- No medical blog section until content has a clear distribution purpose and doctor review.
- No unapproved patient testimonial, doctor fact, institute relationship, outcome claim, or invented platform number.
- No public naming of the doctors involved in building the product unless they separately approve that attribution. The generic `Built by doctors` trust line is approved for V1.
- No blurry doctor photo. A neutral initials placeholder is allowed only for the approved medical-oncology profile until a clear photo is supplied.
- No product naming project that delays the live core flow.
- No visual “AI slop”: generic illustrations, glowing AI effects, inflated language, repetitive cards, or sections without a patient trust purpose.

Every new feature mentioned during Build Week remains parked here unless an item of equal or greater effort is removed from V1.

## 5. RISKIEST ASSUMPTION — what could make this pointless

**Assumption:** A patient or caregiver who does not already know the builder will trust the chat, approved doctor profile, institute-training evidence, testimonials, price, privacy explanation, and within-24-hours promise enough to pay ₹800 without first speaking to the builder.

The private pilot does not prove this assumption. It proves that the human-assisted sequence can lead to consultations. The product is testing whether the same sequence can work through a self-serve website.

The assumption is weakened if people:

- start chatting but leave before seeing a doctor;
- see the doctor but refuse to share contact details;
- submit contact details but do not start payment;
- need WhatsApp or a personal call before almost every payment;
- mistrust the AI boundary, doctor credentials, reports process, privacy, price, or scheduling promise; or
- arrive for low-acuity concerns that do not justify a premium specialist consultation.

Evidence comes from Monday’s observed sessions and the live funnel after Tuesday’s distribution. Report visits, chats, doctor views, contacts, payment attempts, successful payments, revenue, self-serve versus assisted payments, and the most common stopping point.

Polite feedback from friends is not proof. Existing patients paying after personal help is not proof. The strongest Build Week evidence is a stranger completing payment without a live explanation; support-assisted payments are useful revenue but must be reported separately.

If nearly every qualified patient still needs the builder to establish trust manually, the self-serve product in this form has not worked. The next product would need to be reconsidered as an assisted matching service rather than hiding that human step behind more AI or visual polish.
