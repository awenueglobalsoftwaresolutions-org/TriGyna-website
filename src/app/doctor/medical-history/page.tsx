import { redirect } from "next/navigation";

export default function MedicalHistoryRedirectPage() {
  redirect("/doctor/dashboard?tab=medical-history");
}

