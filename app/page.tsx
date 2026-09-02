import { LandingPage } from "@/components/landing/LandingPage";
import { getConsultationPrice } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const price = getConsultationPrice();
  return <LandingPage amountRupees={price.amountRupees} />;
}
