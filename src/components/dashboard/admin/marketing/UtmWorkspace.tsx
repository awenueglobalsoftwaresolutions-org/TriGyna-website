"use client";

import React, { useState, useEffect } from "react";
import {
  Code2,
  Copy,
  Check,
  QrCode,
  Link2,
  ExternalLink,
  Plus,
  Loader2,
  Globe,
  Share2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface UtmWorkspaceProps {
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function UtmWorkspace({ showNotification }: UtmWorkspaceProps) {
  const [links, setLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [destinationUrl, setDestinationUrl] = useState("https://www.trigyna.in/services/pcos");
  const [utmSource, setUtmSource] = useState("facebook");
  const [utmMedium, setUtmMedium] = useState("cpc");
  const [utmCampaign, setUtmCampaign] = useState("pcos_root_cause_healing");
  const [utmContent, setUtmContent] = useState("video_testimonial_dr_ananya");
  const [utmTerm, setUtmTerm] = useState("");
  const [title, setTitle] = useState("PCOS Facebook Ad - Testimonial Creative");
  const [isGenerating, setIsGenerating] = useState(false);

  // Compute live full URL
  const computeFullUrl = () => {
    try {
      const url = new URL(destinationUrl || "https://www.trigyna.in");
      if (utmSource) url.searchParams.set("utm_source", utmSource);
      if (utmMedium) url.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
      if (utmContent) url.searchParams.set("utm_content", utmContent);
      if (utmTerm) url.searchParams.set("utm_term", utmTerm);
      return url.toString();
    } catch {
      return destinationUrl;
    }
  };

  const fullTrackingUrl = computeFullUrl();

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<any[]>("/marketing/utm");
      if (res.data && Array.isArray(res.data)) {
        setLinks(res.data);
      }
    } catch {
      showNotification("Could not load UTM tracking links", true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreateUtm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      const res = await api.post<any>("/marketing/utm", {
        destinationUrl,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        title: title || `${utmCampaign} (${utmSource})`,
      });

      if (res.success) {
        showNotification("Tracking link generated and registered in catalogue!");
        fetchLinks();
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to create UTM link", true);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showNotification("Tracking URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* UTM Generator Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E5EAF0] shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-[#111827]">Campaign UTM Link Builder</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Create standard first-party tracking links for social ads, QR codes, newsletters, and affiliate partners.
          </p>
        </div>

        <form onSubmit={handleCreateUtm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">
                Link Title / Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. PCOS Facebook Ad Creative A"
                className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">
                Destination URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://www.trigyna.in/services/pcos"
                className="w-full text-xs sm:text-sm border border-[#E5EAF0] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#087A50]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">
                Campaign Source (`utm_source`) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                placeholder="facebook, google, instagram"
                className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#087A50]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">
                Campaign Medium (`utm_medium`) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                placeholder="cpc, lead_ad, social, banner"
                className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#087A50]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">
                Campaign Name (`utm_campaign`) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="pcos_root_cause_healing"
                className="w-full text-xs border border-[#E5EAF0] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#087A50]"
              />
            </div>
          </div>

          {/* Generated URL Box */}
          <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0] space-y-2">
            <span className="text-xs font-bold text-[#64748B] block">Generated Full Tracking Link:</span>
            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5EAF0]">
              <span className="font-mono text-xs text-[#087A50] truncate select-all">
                {fullTrackingUrl}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(fullTrackingUrl, "current_preview")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E9F8F0] text-[#087A50] hover:bg-[#D1F2E2] rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                {copiedId === "current_preview" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === "current_preview" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition-all cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Save &amp; Register Tracking Link</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Tracking Links Catalogue */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        <div className="p-5 pb-3 border-b border-[#E5EAF0]/60 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#111827]">Active Tracking Links Catalogue</h3>
          <span className="text-xs text-[#64748B]">{links.length} links registered</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-[#64748B] flex flex-col items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#087A50] mb-2" />
            <span className="text-xs">Loading catalogue...</span>
          </div>
        ) : links.length === 0 ? (
          <div className="py-12 text-center text-[#64748B] text-xs">
            No registered UTM links yet. Generate your first tracking link above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px] bg-[#F8FAFC]">
                  <th className="py-3 px-4">Link Details</th>
                  <th className="py-3 px-3">Source / Medium</th>
                  <th className="py-3 px-3">Campaign Tag</th>
                  <th className="py-3 px-3 text-center">Clicks</th>
                  <th className="py-3 px-3 text-center">Leads</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]/70">
                {links.map((link) => (
                  <tr key={link._id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#111827]">{link.title}</p>
                      <p className="text-[10px] text-[#64748B] font-mono truncate max-w-sm">
                        {link.fullUrl}
                      </p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                        {link.utmSource} / {link.utmMedium}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#087A50]">
                      {link.utmCampaign}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-[#111827]">
                      {link.clicksCount || 0}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-emerald-700">
                      {link.leadsCount || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => copyToClipboard(link.fullUrl, link._id)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#087A50] hover:bg-[#E9F8F0] rounded-lg transition-colors cursor-pointer"
                      >
                        {copiedId === link._id ? "Copied!" : "Copy URL"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
