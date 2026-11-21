"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DoctorSidebar, DoctorTab } from "@/components/dashboard/doctor/DoctorSidebar";
import { DoctorHeader } from "@/components/dashboard/doctor/DoctorHeader";
import { ConsultationModal } from "@/components/dashboard/doctor/ConsultationModal";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api/client";

export default function DoctorConsultationWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params?.consultationId as string;

  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(true);

  useEffect(() => {
    if (!consultationId) return;

    async function fetchConsultation() {
      try {
        setLoading(true);
        const res = await api.get<{ data?: any }>(
          `/api/v1/doctor/consultations/${consultationId}`
        );
        const data = (res as any).data?.consultation || (res as any).data;
        if (data) {
          setConsultation(data);
          // If finalized, redirect to finalized record page
          if (data.isFinalized) {
            router.replace(`/doctor/consultations/${consultationId}/record`);
          }
        }
      } catch (err) {
        console.error("Failed to load consultation", err);
      } finally {
        setLoading(false);
      }
    }

    fetchConsultation();
  }, [consultationId, router]);

  const handleClose = () => {
    router.push("/doctor/dashboard?tab=consultations");
  };

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

            {loading ? (
              <div className="py-24 text-center text-xs text-[#718078]">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#064B38] mb-2" />
                Loading consultation workspace...
              </div>
            ) : (
              <ConsultationModal
                isOpen={modalOpen}
                onClose={handleClose}
                appointmentId={consultation?.appointmentId?._id || consultation?.appointmentId || null}
                patientId={consultation?.patientId?._id || consultation?.patientId || null}
                consultationId={consultationId}
                onConsultationCompleted={() => {
                  router.push(`/doctor/consultations/${consultationId}/record`);
                }}
              />
            )}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}

