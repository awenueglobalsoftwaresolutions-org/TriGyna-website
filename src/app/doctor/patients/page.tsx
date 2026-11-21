import { redirect } from "next/navigation";

export default function PatientsRedirectPage() {
  redirect("/doctor/dashboard?tab=patients");
}

