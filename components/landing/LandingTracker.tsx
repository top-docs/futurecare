"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { getSafeSessionAccess } from "@/lib/session-id";
import {
  captureFirstTouchSource,
  getTrafficSource,
} from "@/lib/tracking";

function getLandingIdentity() {
  const session = getSafeSessionAccess(() => window.localStorage);
  const detected = getTrafficSource(window.location.search, document.referrer);
  try {
    return {
      ...session,
      source: captureFirstTouchSource(window.localStorage, detected),
    };
  } catch {
    return { ...session, source: detected };
  }
}

export function LandingTracker() {
  const recordEvent = useMutation(api.events.recordOnce);

  useEffect(() => {
    const identity = getLandingIdentity();
    void recordEvent({
      sessionId: identity.sessionId,
      name: "landing_view",
      source: identity.source,
    });

    const recordConsultationCta = (event: MouseEvent) => {
      const link = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[href^="/enquiry"]')
        : null;
      if (!link) return;
      void recordEvent({
        sessionId: identity.sessionId,
        name: "cta_selected",
        source: identity.source,
      });
    };

    document.addEventListener("click", recordConsultationCta);
    return () => document.removeEventListener("click", recordConsultationCta);
  }, [recordEvent]);

  return null;
}
