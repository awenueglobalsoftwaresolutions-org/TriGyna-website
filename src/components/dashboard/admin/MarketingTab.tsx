"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { MarketingHeader } from "./marketing/MarketingHeader";
import { MarketingNav, MarketingTabKey } from "./marketing/MarketingNav";
import { OverviewWorkspace } from "./marketing/OverviewWorkspace";
import { CampaignsWorkspace } from "./marketing/CampaignsWorkspace";
import { LeadAttributionWorkspace } from "./marketing/LeadAttributionWorkspace";
import { AdAccountsWorkspace } from "./marketing/AdAccountsWorkspace";
import { UtmWorkspace } from "./marketing/UtmWorkspace";
import { PerformanceWorkspace } from "./marketing/PerformanceWorkspace";
import { MarketingSettingsWorkspace } from "./marketing/MarketingSettingsWorkspace";
import { CreateCampaignModal } from "./marketing/CreateCampaignModal";
import { AutomationBuilderModal } from "./marketing/AutomationBuilderModal";

interface MarketingTabProps {
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function MarketingTab({ showNotification }: MarketingTabProps) {
  const [activeTab, setActiveTab] = useState<MarketingTabKey>("overview");
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [automationBuilderOpen, setAutomationBuilderOpen] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get<any>("/marketing/overview");
      if (res.data) {
        setOverviewData(res.data);
      }
    } catch {
      // In case backend is waking up, silent fallback
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOverview();
    showNotification("Marketing performance analytics refreshed");
  };

  const handleSyncMetaLeads = async () => {
    try {
      setIsSyncingMeta(true);
      const res = await api.post<any>("/marketing/accounts/sync", { provider: "meta" });
      if (res.success) {
        showNotification("Meta Lead Ads synchronized: live leads and campaign insights refreshed");
        fetchOverview();
      }
    } catch (err: any) {
      showNotification(err.message || "Meta synchronization failed", true);
    } finally {
      setIsSyncingMeta(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* 1. Marketing Header */}
      <MarketingHeader
        onCreateCampaign={() => setCreateCampaignOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        integrations={overviewData?.integrations}
      />

      {/* 2. Sub-navigation Tabs */}
      <MarketingNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 3. Main Workspace Based on Active Tab */}
      {isLoading ? (
        <div className="py-24 text-center text-[#64748B] flex flex-col items-center justify-center bg-white rounded-3xl border border-[#E5EAF0]">
          <Loader2 className="w-8 h-8 animate-spin text-[#087A50] mb-3" />
          <span className="text-sm font-medium">Loading Marketing &amp; Ads Engine...</span>
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <OverviewWorkspace
              onNavigateTab={setActiveTab}
              onCreateCampaign={() => setCreateCampaignOpen(true)}
              onSyncMetaLeads={handleSyncMetaLeads}
              isSyncingMeta={isSyncingMeta}
              overviewData={overviewData}
            />
          )}

          {activeTab === "campaigns" && (
            <CampaignsWorkspace
              onCreateCampaign={() => setCreateCampaignOpen(true)}
              showNotification={showNotification}
            />
          )}

          {activeTab === "attribution" && (
            <LeadAttributionWorkspace showNotification={showNotification} />
          )}

          {activeTab === "accounts" && (
            <AdAccountsWorkspace showNotification={showNotification} />
          )}

          {activeTab === "utm" && <UtmWorkspace showNotification={showNotification} />}

          {activeTab === "performance" && (
            <PerformanceWorkspace overviewData={overviewData} />
          )}

          {activeTab === "settings" && (
            <MarketingSettingsWorkspace
              onOpenAutomationBuilder={() => setAutomationBuilderOpen(true)}
              showNotification={showNotification}
            />
          )}
        </>
      )}

      {/* Modals */}
      <CreateCampaignModal
        isOpen={createCampaignOpen}
        onClose={() => setCreateCampaignOpen(false)}
        onSuccess={fetchOverview}
        showNotification={showNotification}
      />

      <AutomationBuilderModal
        isOpen={automationBuilderOpen}
        onClose={() => setAutomationBuilderOpen(false)}
        showNotification={showNotification}
      />
    </div>
  );
}
