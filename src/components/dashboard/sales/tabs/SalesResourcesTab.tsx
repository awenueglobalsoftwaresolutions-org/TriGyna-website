"use client";

import React, { useState } from "react";
import {
  BookOpen,
  FileText,
  Download,
  Share2,
  CheckCircle2,
  Search,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  Sparkles,
} from "lucide-react";

interface ResourceItem {
  id: string;
  title: string;
  category: "protocols" | "packages" | "objections" | "doctors";
  description: string;
  updatedAt: string;
  readTime: string;
  scriptSnippet?: string;
  bulletPoints?: string[];
}

export function SalesResourcesTab() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("res-1");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const resources: ResourceItem[] = [
    {
      id: "res-1",
      title: "PCOD / PCOS Holistic Consultation Call Script",
      category: "protocols",
      description: "Proven consultation conversation structure addressing hormonal symptoms, natural remedies, and establishing trust.",
      updatedAt: "Oct 2026",
      readTime: "4 min read",
      scriptSnippet: `Sales Executive: "Hello [Patient Name], this is [Your Name] from TriGyna Health & Wellness. I received your enquiry regarding holistic PCOD care. I understand how exhausting irregular cycles and hormonal weight fluctuations can be. Our clinical team focuses on root-cause homoeopathic treatment combined with clinical anti-inflammatory nutrition—not temporary hormonal suppression pills. Would a 30-minute online video consultation with our specialist doctor work best for you today or tomorrow?"`,
      bulletPoints: [
        "Acknowledge emotional frustration with conventional birth-control pills",
        "Emphasize zero side-effects and root-cause homoeopathic balance",
        "Offer online consultation timing flexibility (11:00 AM to 7:00 PM)",
      ],
    },
    {
      id: "res-2",
      title: "Chronic Skin & Eczema Care Protocol Guide",
      category: "protocols",
      description: "Clinical guidelines on explaining skin flare-up triggers, constitutional homoeopathy, and gut-skin reversal.",
      updatedAt: "Oct 2026",
      readTime: "3 min read",
      scriptSnippet: `Sales Executive: "Steroid creams often mask eczema temporarily, causing rebound flare-ups. TriGyna’s constitutional approach treats the internal inflammatory trigger. Our patients typically see sustained clarity within 8 to 12 weeks of personalized homoeopathic remedies."`,
      bulletPoints: [
        "Contrast steroid dependence with constitutional cellular healing",
        "Clarify that homoeopathic medicines are sugar globules delivered to their doorstep",
        "Highlight that all doctor video appointments include digital prescriptions",
      ],
    },
    {
      id: "res-3",
      title: "Healthcare Packages & Subscription Comparison Cheat Sheet",
      category: "packages",
      description: "Full breakdown of TriGyna's 1-month, 3-month, and 6-month clinical packages with pricing and value additions.",
      updatedAt: "Oct 2026",
      readTime: "5 min read",
      bulletPoints: [
        "PCOD 3-Month Holistic Reversal Plan: ₹4,999 (Includes 6 Doctor Video Consultations + Doorstep Homoeopathy Medicines + Custom Diet Plan)",
        "Chronic Skin Restoration Plan: ₹3,999 (Includes 4 Doctor Consultations + Bi-weekly progress tracking)",
        "Hair Rejuvenation Therapy: ₹2,999 (Root follicle stimulation & constitutional remedy)",
        "Assisted Checkout allows sending a direct Razorpay payment link via WhatsApp with 1 click",
      ],
    },
    {
      id: "res-4",
      title: "Patient Objection Handling Playbook",
      category: "objections",
      description: "Responses to top 5 patient concerns: 'Is online consultation effective?', 'Does homoeopathy take too long?', 'Pricing comparison'.",
      updatedAt: "Oct 2026",
      readTime: "6 min read",
      scriptSnippet: `Objection: "Does homoeopathy work online?"\nResponse: "Yes, absolutely! Homoeopathy is based on comprehensive symptom mapping, family history, and constitutional analysis—which our senior doctors conduct thoroughly over high-definition video calls. Plus, approved remedies are dispatched directly from our verified pharmacy to your doorstep across India."`,
      bulletPoints: [
        "Online consultation has 98% patient satisfaction and eliminates travel stress",
        "Homoeopathy acts swiftly on acute symptoms when precisely prescribed",
        "Zero hidden fees; medicines and follow-ups are bundled into one transparent price",
      ],
    },
    {
      id: "res-5",
      title: "Clinical Doctor Roster & Qualifications",
      category: "doctors",
      description: "Senior homoeopaths, gynecological specialists, and clinical nutritionists for building patient confidence.",
      updatedAt: "Oct 2026",
      readTime: "3 min read",
      bulletPoints: [
        "Dr. Anita Rao — MD (Homoeopathy), 14+ years clinical experience in hormonal disorders",
        "Dr. Harshali Sutar — Senior Consultant Homoeopath & Women's Health Specialist",
        "All doctors hold recognized central council certifications (CCH / State Councils)",
      ],
    },
  ];

  const filteredResources = resources.filter((res) => {
    if (activeCategory !== "all" && res.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        res.title.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q) ||
        res.bulletPoints?.some((b) => b.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCopyScript = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#172033] tracking-tight">Sales Enablement &amp; Clinical Resources</h2>
        <p className="text-xs sm:text-sm text-[#718096] mt-1">
          Approved scripts, clinical protocol cheat sheets, and objection playbooks for sales excellence
        </p>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EBE8] scrollbar-none">
        {[
          { id: "all", label: "All Resources" },
          { id: "protocols", label: "Consultation Scripts & Protocols" },
          { id: "packages", label: "Package Pricing Guides" },
          { id: "objections", label: "Objection Handling" },
          { id: "doctors", label: "Doctor Profiles & Credibility" },
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCategory(c.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === c.id
                ? "bg-[#E5F4E8] text-[#159447] border border-[#159447]/20"
                : "text-[#718096] hover:text-[#172033] hover:bg-gray-100/60"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search scripts, objections, package details..."
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E5EBE8] bg-white text-xs text-[#172033] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#159447] shadow-2xs"
        />
      </div>

      {/* Resource Cards */}
      <div className="space-y-4">
        {filteredResources.map((res) => {
          const isExpanded = expandedId === res.id;
          return (
            <div
              key={res.id}
              className="bg-white border border-[#E5EBE8] rounded-3xl p-5 sm:p-6 shadow-xs hover:border-[#159447]/40 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#E5F4E8] text-[#159447] flex items-center justify-center shrink-0 mt-0.5">
                    {res.category === "protocols" ? (
                      <Stethoscope className="w-5 h-5" />
                    ) : res.category === "packages" ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <BookOpen className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#172033] leading-snug">{res.title}</h3>
                    <p className="text-xs text-[#718096] mt-1">{res.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-[#718096] mt-2 font-medium">
                      <span>{res.readTime}</span>
                      <span>&bull;</span>
                      <span>Updated {res.updatedAt}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : res.id)}
                  className="px-3 py-1.5 rounded-xl border border-[#E5EBE8] hover:bg-gray-50 text-xs font-semibold text-[#172033] cursor-pointer shrink-0 transition"
                >
                  {isExpanded ? "Collapse" : "Open Guide"}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-5 pt-4 border-t border-[#E5EBE8] space-y-4 text-xs animate-fade-in">
                  {res.scriptSnippet && (
                    <div className="bg-[#F7F9F8] border border-[#E5EBE8] rounded-2xl p-4 relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[10px] uppercase text-[#159447] tracking-wider">
                          Ready-to-use Spoken Pitch Script
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyScript(res.id, res.scriptSnippet!)}
                          className="text-[11px] font-bold text-[#159447] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === res.id ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <span>Copy Script</span>
                          )}
                        </button>
                      </div>
                      <p className="text-gray-800 leading-relaxed font-sans italic whitespace-pre-line">
                        {res.scriptSnippet}
                      </p>
                    </div>
                  )}

                  {res.bulletPoints && (
                    <div className="space-y-2">
                      <span className="font-bold text-[11px] text-[#172033] uppercase tracking-wider block">
                        Key Discussion Points &amp; Highlights
                      </span>
                      <ul className="space-y-1.5 pl-4 list-disc text-[#718096]">
                        {res.bulletPoints.map((bp, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="text-[#172033] font-medium">{bp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
