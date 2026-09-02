"use client";

import dynamic from "next/dynamic";

const GuidedJourney = dynamic(
  () => import("@/components/journey/GuidedJourney").then((module) => module.GuidedJourney),
  {
    ssr: false,
    loading: () => (
      <section className="journey-system-state" role="status">
        <p>Opening your private request…</p>
      </section>
    ),
  },
);

export function GuidedJourneyLoader() {
  return <GuidedJourney />;
}
