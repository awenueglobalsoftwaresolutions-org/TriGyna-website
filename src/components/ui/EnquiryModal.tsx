"use client";

import React, { useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import EnquiryForm from "./EnquiryForm";

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialService?: string;
}

export default function EnquiryModal({
  isOpen,
  onClose,
  initialService,
}: EnquiryModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0E3828]/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#F9F7F1] rounded-3xl shadow-2xl border border-[#E8E2D6] p-6 sm:p-8 z-10 animate-fade-in overflow-hidden">
        {/* Subtle decorative leaf accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#A7C089]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D6]/80 mb-5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-full bg-[#154734]/10 text-[#154734]">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B8F5B]">
                CONSULTATION ENQUIRY
              </span>
              <h3 className="font-serif text-xl sm:text-2xl text-[#154734] font-semibold">
                Begin Your Wellness Journey
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:text-gray-800 hover:bg-black/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#626B63] mb-5 leading-relaxed">
          Connect directly with <strong>Dr. Harshali Sutar</strong> for personalized clinical counsel. Tell us a bit about your healthcare goals.
        </p>

        <EnquiryForm initialService={initialService} onSuccess={onClose} compact />
      </div>
    </div>
  );
}
