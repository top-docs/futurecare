import Image from "next/image";
import Link from "next/link";
import { GuidedJourneyLoader } from "@/components/journey/GuidedJourneyLoader";

export default function EnquiryPage() {
  return (
    <main className="guided-journey-page">
      <header className="guided-journey-header">
        <Link href="/" aria-label="Return to Top Docs home" className="landing-brand">
          <Image src="/brand/top-docs-symbol.webp" alt="" width={42} height={42} priority />
          <span>Top Docs</span>
        </Link>
        <span>Specialist consultation request</span>
      </header>
      <div className="guided-journey-frame">
        <GuidedJourneyLoader />
      </div>
    </main>
  );
}
