import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ALL_SPECIALISTS,
  FEATURED_SPECIALISTS,
  FOUNDER_THESIS,
  INSTITUTE_PROOF,
  INSTITUTE_ROTATION,
  LANDING_FAQS,
  LANDING_PRIMARY_CTA,
  PUBLIC_TESTIMONIALS,
  SERVICE_FACTS,
  SPECIALTY_PROOF,
} from "../../lib/landing-content.ts";
import { DOCTORS } from "../../lib/doctors.ts";

test("landing content uses one approved journey action", () => {
  assert.equal(LANDING_PRIMARY_CTA.label, "Find my specialist");
  assert.equal(LANDING_PRIMARY_CTA.href, "/enquiry?start=new");
});

test("featured specialists are six approved roster records", () => {
  assert.equal(FEATURED_SPECIALISTS.length, 6);

  const approvedIds = new Set(DOCTORS.map((doctor) => doctor.id));
  for (const doctor of FEATURED_SPECIALISTS) {
    assert.equal(approvedIds.has(doctor.id), true);
  }
});

test("landing shows the five builder-approved institute marks", () => {
  assert.deepEqual(
    INSTITUTE_PROOF.map((institute) => institute.shortName),
    ["AIIMS", "PGIMER", "Tata Memorial", "JIPMER", "CMC Vellore"],
  );
  assert.deepEqual(INSTITUTE_ROTATION, INSTITUTE_PROOF.map((institute) => institute.shortName));
});

test("the compact specialty proof has six common areas and an uncertainty path", () => {
  assert.deepEqual(
    SPECIALTY_PROOF.map((specialty) => specialty.name),
    ["Gynaecology", "Gastroenterology", "Cardiology", "Neurology", "Oncology", "Orthopaedics"],
  );
  assert.equal(SPECIALTY_PROOF.every((specialty) => specialty.href === "/enquiry?start=new"), true);
});

test("the all-doctors reveal contains the full approved public roster", () => {
  assert.equal(ALL_SPECIALISTS.length, 16);
  assert.equal(ALL_SPECIALISTS.some((doctor) => doctor.id === "chitrakshi-nagpal"), false);

  for (const id of [
    "harshad-bagde",
    "vedang-desai",
    "shainy-p",
    "dinesh-walia",
    "shubham-garg",
    "shreya-panda",
  ]) {
    assert.equal(ALL_SPECIALISTS.some((doctor) => doctor.id === id), true);
  }

  assert.equal(
    ALL_SPECIALISTS.find((doctor) => doctor.id === "shubham-garg")?.specialty,
    "Physician",
  );
});

test("unsupported testimonials stay hidden", () => {
  assert.deepEqual(PUBLIC_TESTIMONIALS, []);
});

test("FAQs explain the paid service boundaries", () => {
  const answerText = LANDING_FAQS.map((item) => item.answer).join(" ");
  assert.match(answerText, /₹800/);
  assert.match(answerText, /WhatsApp/);
  assert.match(answerText, /emergency/i);
  assert.doesNotMatch(answerText, /free 5-minute/i);
});

test("service facts explain how patient details are used", () => {
  assert.match(SERVICE_FACTS.map((fact) => fact.value).join(" "), /case and contact details/i);
});

test("founder thesis is personal without exposing private clinical details", () => {
  const founderCopy = [
    FOUNDER_THESIS.heading,
    ...FOUNDER_THESIS.paragraphs,
  ].join(" ");

  assert.match(founderCopy, /second opinion/i);
  assert.match(founderCopy, /my mother/i);
  assert.match(founderCopy, /credible specialist/i);
  assert.equal(FOUNDER_THESIS.portrait, "/founders/lokesh-dange-avatar.png");
  assert.doesNotMatch(founderCopy, /uterus|laparoscopy|open surgery|Dr\. Kirti/i);
});

test("public landing copy stays plain and doctor cards use a generic booking action", () => {
  const landingSource = readFileSync(new URL("../../components/landing/LandingPage.tsx", import.meta.url), "utf8");
  const trustSource = readFileSync(new URL("../../components/landing/TrustSections.tsx", import.meta.url), "utf8");
  const publicCopy = `${landingSource}\n${trustSource}`;

  assert.match(publicCopy, /Specialist care/);
  assert.match(publicCopy, /for your next step/);
  assert.match(publicCopy, /Get a specialist consultation from doctors trained at leading medical institutes/);
  assert.match(publicCopy, /specialty-icon/);
  assert.match(publicCopy, /Check consultation availability/);
  assert.doesNotMatch(publicCopy, /guided journey|training provenance|approved network/i);
  assert.doesNotMatch(publicCopy, /selectedSpecialty|doctorId/);
});

test("hero keeps pricing out of the premium message and requests sharp doctor portraits", () => {
  const landingSource = readFileSync(new URL("../../components/landing/LandingPage.tsx", import.meta.url), "utf8");
  const heroSource = landingSource.slice(
    landingSource.indexOf('<section className="landing-hero"'),
    landingSource.indexOf("<InstituteProof />"),
  );

  assert.doesNotMatch(heroSource, /hero-price|introductory price|Price today/);
  assert.equal((heroSource.match(/sizes="180px"/g) ?? []).length, 3);
  assert.equal((heroSource.match(/unoptimized/g) ?? []).length, 3);
});

test("desktop hero gives the doctor card sixty percent of the available columns", () => {
  const landingStyles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const desktopHeroStyles = landingStyles.slice(
    landingStyles.indexOf("@media (min-width: 1001px)"),
    landingStyles.indexOf("@media (max-width: 1100px)"),
  );

  assert.match(desktopHeroStyles, /grid-template-columns: minmax\(0, 2fr\) minmax\(0, 3fr\)/);
  assert.match(desktopHeroStyles, /\.provenance-folio\s*\{[^}]*width: 100%/);
});

test("desktop institute proof doubles the emblem size without changing mobile", () => {
  const landingStyles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const trustSource = readFileSync(new URL("../../components/landing/TrustSections.tsx", import.meta.url), "utf8");
  const desktopInstituteStyles = landingStyles.slice(
    landingStyles.indexOf("@media (min-width: 781px)"),
    landingStyles.indexOf("@media (min-width: 1001px)"),
  );

  assert.match(desktopInstituteStyles, /\.institute-proof\s*\{[^}]*padding-block: 68px/);
  assert.match(desktopInstituteStyles, /\.institute-folio\s*\{[^}]*width: min\(1040px, 100%\)/);
  assert.match(desktopInstituteStyles, /\.institute-entry img\s*\{[^}]*width: 104px;[^}]*height: 104px/);
  assert.equal((trustSource.match(/width=\{144\}/g) ?? []).length, 1);
  assert.equal((trustSource.match(/height=\{144\}/g) ?? []).length, 1);
});

test("how it works uses a safe four-step product tour on desktop and mobile", () => {
  const landingSource = readFileSync(new URL("../../components/landing/LandingPage.tsx", import.meta.url), "utf8");
  const trustSource = readFileSync(new URL("../../components/landing/TrustSections.tsx", import.meta.url), "utf8");
  const tourSource = readFileSync(new URL("../../components/landing/ConsultationTour.tsx", import.meta.url), "utf8");

  assert.match(landingSource, /<ConsultationProcess amountRupees=\{amountRupees\} \/>/);
  assert.match(
    landingSource,
    /<SpecialtyProof \/>\s*<ConsultationProcess amountRupees=\{amountRupees\} \/>\s*<FeaturedSpecialists \/>/,
  );
  assert.match(trustSource, /<ConsultationTour amountRupees=\{amountRupees\} doctor=\{FEATURED_SPECIALISTS\[0\]\} \/>/);
  assert.equal((tourSource.match(/title: "/g) ?? []).length, 4);
  assert.match(tourSource, /CONSULTATION_TYPE_CHOICES/);
  assert.match(tourSource, /SPECIALTY_CHOICES/);
  assert.match(tourSource, /amountRupees\.toLocaleString\("en-IN"\)/);
  assert.match(tourSource, /aria-live="polite"/);
  assert.match(tourSource, /onTouchStart/);
  assert.match(tourSource, /onTouchEnd/);
  assert.doesNotMatch(tourSource, /setInterval|auto-?play/i);
  assert.doesNotMatch(tourSource, /₹800|9876543215|Build Week|Delayed Periods/i);
});
