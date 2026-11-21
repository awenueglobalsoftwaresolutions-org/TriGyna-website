import { redirect } from "next/navigation";

export default function AppointmentsRedirectPage() {
  redirect("/doctor/dashboard?tab=appointments");
}

