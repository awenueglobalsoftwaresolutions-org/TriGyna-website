import { redirect } from "next/navigation";

export default function ReportsRedirectPage() {
  redirect("/doctor/dashboard?tab=reports");
}

