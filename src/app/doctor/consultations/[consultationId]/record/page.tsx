"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DoctorSidebar } from "@/components/dashboard/doctor/DoctorSidebar";
import { DoctorHeader } from "@/components/dashboard/doctor/DoctorHeader";
import { FinalizedRecordModal } from "@/components/dashboard/doctor/consultations/FinalizedRecordModal";
import { ConsultationAmendmentModal } from "@/components/dashboard/doctor/consultations/ConsultationAmendmentModal";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DoctorFinalizedClinicalRecordPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params?.consultationId as string;

  const [amendmentOpen, setAmendmentOpen] = useState(false);

  return (
    <RoleGuard allowedRoles={["doctor", "owner", "admin"]}>
      <div className="h-screen w-full bg-[#F5F8F6] text-[#17251E] flex flex-col md:flex-row antialiased overflow-hidden">
        <aside className="w-64 shrink-0 hidden md:block">
          <DoctorSidebar
            activeTab="consultations"
            onTabChange={(tab) => router.push(`/doctor/dashboard?tab=${tab}`)}
            doctorName="Dr. Ananya Sharma"
          />
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DoctorHeader
            doctorName="Dr. Ananya Sharma"
            onNavigateTab={(tab) => router.push(`/doctor/dashboard?tab=${tab}`)}
          />

          <main className="flex-1 overflow-y-auto p-6 space-y-4">
            <Link
              href="/doctor/dashboard?tab=consultations"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#064B38] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Consultations Directory
            </Link>

            <FinalizedRecordModal
              isOpen={true}
              onClose={() => router.push("/doctor/dashboard?tab=consultations")}
              consultationId={consultationId}
              onOpenAmendment={() => setAmendmentOpen(true)}
            />

            <ConsultationAmendmentModal
              isOpen={amendmentOpen}
              onClose={() => setAmendmentOpen(false)}
              consultationId={consultationId}
              onAmendmentSuccess={() => {
                // Refresh record view
                window.location.reload();
              }}
            />
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}

