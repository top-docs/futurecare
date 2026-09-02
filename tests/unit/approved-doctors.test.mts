import assert from "node:assert/strict";
import test from "node:test";

import {
  getApprovedDoctorStatus,
  resolveApprovedDoctor,
} from "../../convex/approvedDoctors.ts";
import { DOCTORS, findDoctorById } from "../../lib/doctors.ts";

test("server derives the consultation area from an approved doctor", () => {
  assert.deepEqual(resolveApprovedDoctor("mridul-mahajan"), {
    doctorId: "mridul-mahajan",
    specialty: "Gastroenterology",
  });
});

test("server rejects an unknown doctor instead of saving client data", () => {
  assert.throws(
    () => resolveApprovedDoctor("invented-doctor"),
    /not in the approved launch roster/,
  );
});

test("server reports active and missing roster status without throwing", () => {
  assert.equal(getApprovedDoctorStatus("mridul-mahajan"), "active");
  assert.equal(getApprovedDoctorStatus("invented-doctor"), "missing");
});

test("client doctor lookup fails closed and keeps the approved oncology initials", () => {
  assert.equal(findDoctorById("invented-doctor"), null);
  assert.deepEqual(findDoctorById("chitrakshi-nagpal")?.portrait, {
    kind: "initials",
    initials: "CN",
  });
});

test("only the approved medical oncologist uses an initials placeholder", () => {
  assert.deepEqual(
    DOCTORS
      .filter((doctor) => doctor.portrait.kind === "initials")
      .map((doctor) => [doctor.id, doctor.portrait.kind === "initials" ? doctor.portrait.initials : ""]),
    [["chitrakshi-nagpal", "CN"]],
  );
});

test("approved doctor cards avoid superiority claims", () => {
  for (const doctor of DOCTORS) {
    const publicCopy = [
      doctor.name,
      doctor.qualifications,
      doctor.training,
      doctor.focus,
    ].join(" ");
    assert.doesNotMatch(publicCopy, /\b(?:best|top doctor)\b/i);
  }
});
