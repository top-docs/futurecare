"use client";

import dynamic from "next/dynamic";

const CompletionStatus = dynamic(() => import("@/components/payment/CompletionStatus").then((module) => module.CompletionStatus), { ssr: false, loading: () => <section className="completion-card" role="status"><p>Confirming your payment…</p></section> });
export function CompletionStatusLoader() { return <CompletionStatus />; }
