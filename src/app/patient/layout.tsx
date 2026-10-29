import React from "react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { PatientShell } from "@/components/patient/PatientShell";

export const metadata = {
  title: "Patient Portal | TriGyna Women Health & Wellness",
  description: "Personal healthcare management portal for TriGyna patients.",
};

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["patient", "admin", "owner"]} pageTitle="Patient Portal">
      <PatientShell>{children}</PatientShell>
    </RoleGuard>
  );
}
