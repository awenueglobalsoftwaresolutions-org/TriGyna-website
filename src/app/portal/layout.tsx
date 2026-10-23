"use client";

import React from "react";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F9F7F1]">
      {children}
    </div>
  );
}
