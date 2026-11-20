import { redirect } from "next/navigation";

export default function FollowUpsRedirectPage() {
  redirect("/doctor/dashboard?tab=followups");
}

