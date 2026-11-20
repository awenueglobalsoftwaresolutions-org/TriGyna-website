import { redirect } from "next/navigation";

export default function NotificationsRedirectPage() {
  redirect("/doctor/dashboard?tab=notifications");
}

