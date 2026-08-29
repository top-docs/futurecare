import Image from "next/image";
import { KIRTI_SINHA } from "@/lib/doctors";

export function DoctorCard({ onContinue }: { onContinue: () => void }) {
  return (
    <article className="doctor-card">
      <div className="doctor-photo-wrap">
        <Image
          className="doctor-photo"
          src={KIRTI_SINHA.photoUrl}
          alt={KIRTI_SINHA.name}
          width={180}
          height={180}
          sizes="(max-width: 640px) 104px, 128px"
        />
        <span className="verified-pill">Profile verified</span>
      </div>
      <div className="doctor-details">
        <p className="doctor-specialty">{KIRTI_SINHA.specialty}</p>
        <h2>{KIRTI_SINHA.name}</h2>
        <p className="doctor-qualifications">{KIRTI_SINHA.qualifications}</p>
        <p className="doctor-focus">{KIRTI_SINHA.focus}</p>
        <div className="consultation-facts">
          <span>Online consultation</span>
          <span>Within 24 hours</span>
        </div>
        <div className="doctor-action-row">
          <div className="price-block">
            <strong>₹800</strong>
            <small>Introductory price</small>
          </div>
          <button className="primary-button" type="button" onClick={onContinue}>
            See a Doctor
          </button>
        </div>
      </div>
    </article>
  );
}

