"use client";

import React, { createContext, useContext, useState } from "react";
import EnquiryModal from "@/components/ui/EnquiryModal";

interface EnquiryModalContextType {
  isOpen: boolean;
  preselectedService: string;
  openEnquiryModal: (service?: string) => void;
  closeEnquiryModal: () => void;
}

const EnquiryModalContext = createContext<EnquiryModalContextType | undefined>(undefined);

export function EnquiryModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState("");

  const openEnquiryModal = (service = "") => {
    setPreselectedService(service);
    setIsOpen(true);
  };

  const closeEnquiryModal = () => {
    setIsOpen(false);
    setPreselectedService("");
  };

  return (
    <EnquiryModalContext.Provider
      value={{
        isOpen,
        preselectedService,
        openEnquiryModal,
        closeEnquiryModal,
      }}
    >
      {children}
      <EnquiryModal isOpen={isOpen} onClose={closeEnquiryModal} initialService={preselectedService} />
    </EnquiryModalContext.Provider>
  );
}

export function useEnquiryModal() {
  const context = useContext(EnquiryModalContext);
  if (!context) {
    throw new Error("useEnquiryModal must be used within an EnquiryModalProvider");
  }
  return context;
}
