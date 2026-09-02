"use client";

import { useEffect, useState } from "react";

import { INSTITUTE_ROTATION } from "@/lib/landing-content";

export function RotatingInstitute() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % INSTITUTE_ROTATION.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <span className="rotating-institute">
      <span className="rotating-institute-visible" aria-hidden="true" key={activeIndex}>
        {INSTITUTE_ROTATION[activeIndex]}
      </span>
      <span className="sr-only">AIIMS, PGIMER, Tata Memorial, JIPMER and CMC Vellore</span>
    </span>
  );
}
