import { redirect } from "next/navigation";

export default function ProfileRedirectPage() {
  redirect("/doctor/dashboard?tab=profile");
}

