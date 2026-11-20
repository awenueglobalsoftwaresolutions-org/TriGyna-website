import { redirect } from "next/navigation";

export default function ConsultationsRedirectPage() {
  redirect("/doctor/dashboard?tab=consultations");
}

