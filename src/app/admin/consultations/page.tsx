import { redirect } from "next/navigation";

export default function AdminConsultationsRedirectPage() {
  redirect("/admin/dashboard?tab=consultations");
}

