"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api, getBaseUrl } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";

import {
  CrmLead,
  CrmKpis,
  CrmTabType,
  FollowUpItem,
  CrmTaskItem,
  LeadSourceItem,
} from "./crm/crmTypes";

import { CrmPageHeader } from "./crm/CrmPageHeader";
import { CrmNavTabs } from "./crm/CrmNavTabs";
import { CrmKpiCards } from "./crm/CrmKpiCards";
import { CrmPipelineKanban } from "./crm/CrmPipelineKanban";
import { CrmRecentLeadsTable } from "./crm/CrmRecentLeadsTable";
import { CrmMyTasksWidget } from "./crm/CrmMyTasksWidget";
import { CrmTodayFollowupsWidget } from "./crm/CrmTodayFollowupsWidget";
import { CrmLeadSourcesWidget } from "./crm/CrmLeadSourcesWidget";

import { CrmAllLeadsView } from "./crm/CrmAllLeadsView";
import { CrmFollowupsHub } from "./crm/CrmFollowupsHub";
import { CrmTasksAndActivitiesTab } from "./crm/CrmTasksAndActivitiesTab";
import { CrmCampaignsTab } from "./crm/CrmCampaignsTab";
import { CrmReportsTab } from "./crm/CrmReportsTab";

import { CrmAddLeadModal } from "./crm/CrmAddLeadModal";
import { CrmImportCsvModal } from "./crm/CrmImportCsvModal";
import { CrmLeadDetailDrawer } from "./crm/CrmLeadDetailDrawer";
import { CrmConvertPatientModal } from "./crm/CrmConvertPatientModal";
import { CrmMarkLostModal } from "./crm/CrmMarkLostModal";
import { CrmScheduleFollowupModal } from "./crm/CrmScheduleFollowupModal";

export type { CrmLead };
export type CrmViewType = CrmTabType;

export interface CrmExactTabProps {
  showNotification: (msg: string, isError?: boolean) => void;
  onTabChange?: (tabId: string) => void;
  initialView?: CrmTabType;
}

export function CrmExactTab({
  showNotification,
  onTabChange: _onTabChange,
  initialView = "overview",
}: CrmExactTabProps) {
  const { user } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<CrmTabType>(initialView || "overview");

  // Core Data
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [kpis, setKpis] = useState<CrmKpis | null>(null);
  const [followUpsData, setFollowUpsData] = useState<{
    dueToday: FollowUpItem[];
    overdue: FollowUpItem[];
    upcoming: FollowUpItem[];
    completed: FollowUpItem[];
  }>({ dueToday: [], overdue: [], upcoming: [], completed: [] });
  const [todayTasks, setTodayTasks] = useState<CrmTaskItem[]>([]);
  const [todayFollowupsList, setTodayFollowupsList] = useState<FollowUpItem[]>([]);
  const [sourcesList, setSourcesList] = useState<LeadSourceItem[]>([]);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Modals & Drawer State
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [addLeadPreselectedStage, setAddLeadPreselectedStage] = useState("new");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<CrmLead | null>(null);
  const [leadToMarkLost, setLeadToMarkLost] = useState<CrmLead | null>(null);
  const [leadToScheduleFollowup, setLeadToScheduleFollowup] = useState<CrmLead | null>(null);

  // Load CRM Data from Backend
  const loadCrmData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Overview KPIs & Summary
      const overviewRes = await api.get<{
        kpis: CrmKpis;
        sourcesBreakdown?: LeadSourceItem[];
        todayFollowUps?: FollowUpItem[];
        todayTasks?: CrmTaskItem[];
        recentLeads?: CrmLead[];
      }>("/crm/overview");

      if (overviewRes.success && overviewRes.data) {
        setKpis(overviewRes.data.kpis);
        if (overviewRes.data.sourcesBreakdown) {
          setSourcesList(overviewRes.data.sourcesBreakdown);
        }
        if (overviewRes.data.todayFollowUps) {
          setTodayFollowupsList(overviewRes.data.todayFollowUps);
        }
        if (overviewRes.data.todayTasks) {
          setTodayTasks(overviewRes.data.todayTasks);
        }
      }

      // 2. Leads collection
      const leadsRes = await api.get<{ leads?: CrmLead[]; total?: number }>("/crm/leads?limit=100");
      if (leadsRes.success && leadsRes.data?.leads) {
        setLeads(leadsRes.data.leads);

        // Aggregate activities
        const allActs: any[] = [];
        leadsRes.data.leads.forEach((l) => {
          (l.activities || []).forEach((a) => {
            allActs.push({
              ...a,
              leadName: l.fullName,
            });
          });
        });
        allActs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActivitiesList(allActs);
      }

      // 3. Follow-ups Hub
      const fuRes = await api.get<{
        dueToday: FollowUpItem[];
        overdue: FollowUpItem[];
        upcoming: FollowUpItem[];
        completed: FollowUpItem[];
      }>("/crm/follow-ups");

      if (fuRes.success && fuRes.data) {
        setFollowUpsData({
          dueToday: fuRes.data.dueToday || [],
          overdue: fuRes.data.overdue || [],
          upcoming: fuRes.data.upcoming || [],
          completed: fuRes.data.completed || [],
        });
        if (!overviewRes.data?.todayFollowUps || overviewRes.data.todayFollowUps.length === 0) {
          setTodayFollowupsList(fuRes.data.dueToday || []);
        }
      }
    } catch (err: any) {
      console.warn("Failed to load live CRM data:", err);
      showNotification("Could not sync with CRM database. Please refresh.", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadCrmData();
  }, [loadCrmData]);

  // Stage Move Drag-and-Drop Handler
  const handleMoveLeadStage = async (leadId: string, newStage: string) => {
    const lead = leads.find((l) => l._id === leadId);
    if (!lead) return;

    if (newStage === "lost") {
      setLeadToMarkLost(lead);
      return;
    }

    if (newStage === "converted") {
      setLeadToConvert(lead);
      return;
    }

    // Optimistic UI update
    const previousLeads = [...leads];
    setLeads((prev) =>
      prev.map((l) => (l._id === leadId ? { ...l, status: newStage } : l))
    );

    try {
      const res = await api.patch(`/crm/leads/${leadId}/stage`, { status: newStage });
      if (res.success) {
        showNotification(`Lead "${lead.fullName}" moved to ${newStage.toUpperCase()}`);
        loadCrmData();
      } else {
        setLeads(previousLeads);
        showNotification(res.message || "Failed to update stage", true);
      }
    } catch (err: any) {
      setLeads(previousLeads);
      showNotification(err?.message || "Stage update failed", true);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "open" : "completed";
    try {
      await api.patch(`/crm/follow-ups/${taskId}`, { status: newStatus });
      showNotification(`Task marked as ${newStatus}`);
      loadCrmData();
    } catch (err: any) {
      showNotification("Could not update task status", true);
    }
  };

  // Add Task
  const handleAddTask = async (title: string, priority: string, dueDate: string) => {
    try {
      const targetLeadId = leads[0]?._id;
      if (!targetLeadId) {
        showNotification("Please create a lead first", true);
        return;
      }
      const res = await api.post(`/crm/leads/${targetLeadId}/tasks`, {
        title,
        priority,
        dueDate: dueDate || new Date().toISOString(),
      });
      if (res.success) {
        showNotification("Task created successfully!");
        loadCrmData();
      }
    } catch (err: any) {
      showNotification("Failed to create task", true);
    }
  };

  // Export CSV Handler
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const baseUrl = getBaseUrl();
      const token = localStorage.getItem("trigyna_token");
      const url = `${baseUrl.replace(/\/+$/, "")}/crm/leads/export`;

      const response = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export leads CSV");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `trigyna-leads-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showNotification("Leads CSV exported successfully!");
    } catch (err: any) {
      showNotification(err?.message || "Failed to export leads", true);
    } finally {
      setIsExporting(false);
    }
  };

  // Communication Action Handlers
  const handleCall = (contact: { phone?: string; leadPhone?: string; fullName?: string; leadName?: string }) => {
    const phone = contact.phone || contact.leadPhone || "";
    const name = contact.fullName || contact.leadName || "Contact";
    if (typeof window !== "undefined" && phone) {
      window.open(`tel:${phone}`, "_self");
    }
    showNotification(`Initiated dialer for ${name} (${phone})`);
  };

  const handleWhatsApp = (contact: { phone?: string; leadPhone?: string; fullName?: string; leadName?: string; _id?: string; leadId?: string }) => {
    const rawPhone = contact.phone || contact.leadPhone || "";
    const name = contact.fullName || contact.leadName || "Contact";
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const text = encodeURIComponent(
      `Hello ${name}, thank you for contacting TriGyna Health & Wellness. How can we assist you with your consultation today?`
    );
    if (typeof window !== "undefined" && cleanPhone) {
      window.open(`https://wa.me/${formattedPhone}?text=${text}`, "_blank");
    }
    const leadId = contact._id || contact.leadId;
    if (leadId) {
      api.post(`/crm/leads/${leadId}/activities`, {
        action: "WHATSAPP_OPENED",
        details: `Direct WhatsApp conversation opened with ${name}`,
      }).catch(() => {});
    }
    showNotification(`Opened WhatsApp conversation for ${name}`);
  };

  return (
    <div className="space-y-5 font-sans pb-12">
      {/* 1. Header (Reference Matched) */}
      <CrmPageHeader
        onAddLead={() => {
          setAddLeadPreselectedStage("new");
          setIsAddLeadModalOpen(true);
        }}
        onImport={() => setIsImportModalOpen(true)}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
      />

      {/* 2. Navigation Tabs (Reference Matched 7 Tabs) */}
      <CrmNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 3. Five Dynamic KPI Cards (Reference Matched) */}
      <CrmKpiCards
        kpis={kpis}
        isLoading={isLoading}
        onSelectKpi={(key) => {
          if (key === "total" || key === "new") setActiveTab("pipeline");
          else if (key === "followups") setActiveTab("followups");
          else if (key === "consultations" || key === "converted") setActiveTab("all_leads");
        }}
      />

      {/* 4. Active Tab Content Workspace */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (Approx 72% / 8.5 Cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Block 1: Lead Pipeline Kanban */}
            <CrmPipelineKanban
              leads={leads}
              totalLeadsCount={kpis?.totalLeads ?? leads.length}
              conversionRate={kpis?.conversionRate ?? 31}
              onSelectLead={(l) => {
                setSelectedLead(l);
                setIsDetailDrawerOpen(true);
              }}
              onAddLeadAtStage={(stageId) => {
                setAddLeadPreselectedStage(stageId);
                setIsAddLeadModalOpen(true);
              }}
              onMoveLeadStage={handleMoveLeadStage}
              isLoading={isLoading}
            />

            {/* Block 2: Recent Leads Table */}
            <CrmRecentLeadsTable
              leads={leads}
              onSelectLead={(l: CrmLead) => {
                setSelectedLead(l);
                setIsDetailDrawerOpen(true);
              }}
              onCallLead={handleCall}
              onWhatsAppLead={handleWhatsApp}
              onConvertLead={(l: CrmLead) => setLeadToConvert(l)}
              onMarkLost={(l: CrmLead) => setLeadToMarkLost(l)}
              onScheduleFollowup={(l: CrmLead) => setLeadToScheduleFollowup(l)}
              onEditLead={(l: CrmLead) => {
                setSelectedLead(l);
                setIsDetailDrawerOpen(true);
              }}
              currentUserId={user?._id}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column (Approx 28% / 3.5 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Widget 1: My Tasks (Today) */}
            <CrmMyTasksWidget
              tasks={todayTasks}
              onToggleTask={handleToggleTask}
              onViewAllTasks={() => setActiveTab("tasks")}
              isLoading={isLoading}
            />

            {/* Widget 2: Today's Follow-ups */}
            <CrmTodayFollowupsWidget
              followUps={todayFollowupsList}
              onCallFollowUp={handleCall}
              onWhatsAppFollowUp={handleWhatsApp}
              onOpenLead={(leadId) => {
                const found = leads.find((l) => l._id === leadId);
                if (found) {
                  setSelectedLead(found);
                  setIsDetailDrawerOpen(true);
                }
              }}
              onViewAllFollowups={() => setActiveTab("followups")}
              isLoading={isLoading}
            />

            {/* Widget 3: Lead Sources Donut Chart */}
            <CrmLeadSourcesWidget
              sources={sourcesList}
              totalLeads={kpis?.totalLeads ?? leads.length}
              onSelectSource={() => setActiveTab("campaigns")}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Full Lead Pipeline */}
      {activeTab === "pipeline" && (
        <CrmPipelineKanban
          leads={leads}
          totalLeadsCount={kpis?.totalLeads ?? leads.length}
          conversionRate={kpis?.conversionRate ?? 31}
          onSelectLead={(l) => {
            setSelectedLead(l);
            setIsDetailDrawerOpen(true);
          }}
          onAddLeadAtStage={(stageId) => {
            setAddLeadPreselectedStage(stageId);
            setIsAddLeadModalOpen(true);
          }}
          onMoveLeadStage={handleMoveLeadStage}
          isLoading={isLoading}
        />
      )}

      {/* Tab 3: All Leads Directory */}
      {activeTab === "all_leads" && (
        <CrmAllLeadsView
          leads={leads}
          onSelectLead={(l) => {
            setSelectedLead(l);
            setIsDetailDrawerOpen(true);
          }}
          onCall={handleCall}
          onWhatsApp={handleWhatsApp}
          onConvert={(l) => setLeadToConvert(l)}
          onMarkLost={(l) => setLeadToMarkLost(l)}
          onExportCsv={handleExportCsv}
          isLoading={isLoading}
        />
      )}

      {/* Tab 4: Follow-ups Hub */}
      {activeTab === "followups" && (
        <CrmFollowupsHub
          dueToday={followUpsData.dueToday}
          overdue={followUpsData.overdue}
          upcoming={followUpsData.upcoming}
          completed={followUpsData.completed}
          onCompleteFollowup={async (id) => {
            await api.patch(`/crm/follow-ups/${id}`, { status: "completed" });
            showNotification("Follow-up marked completed");
            loadCrmData();
          }}
          onScheduleNew={() => {
            if (leads[0]) setLeadToScheduleFollowup(leads[0]);
          }}
          onCall={handleCall}
          onWhatsApp={handleWhatsApp}
          onOpenLead={(leadId) => {
            const found = leads.find((l) => l._id === leadId);
            if (found) {
              setSelectedLead(found);
              setIsDetailDrawerOpen(true);
            }
          }}
          isLoading={isLoading}
        />
      )}

      {/* Tab 5: Tasks & Activities */}
      {activeTab === "tasks" && (
        <CrmTasksAndActivitiesTab
          tasks={todayTasks}
          activities={activitiesList}
          onToggleTask={handleToggleTask}
          onAddTask={handleAddTask}
          isLoading={isLoading}
        />
      )}

      {/* Tab 6: Campaigns & Sources */}
      {activeTab === "campaigns" && (
        <CrmCampaignsTab
          leads={leads}
          sources={sourcesList}
          showNotification={showNotification}
          isLoading={isLoading}
        />
      )}

      {/* Tab 7: Reports & Analytics */}
      {activeTab === "reports" && <CrmReportsTab leads={leads} isLoading={isLoading} />}

      {/* =========================================================================
          MODALS & DRAWERS
          ========================================================================= */}
      {/* Add Lead Modal */}
      <CrmAddLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        onLeadCreated={loadCrmData}
        showNotification={showNotification}
        preselectedStage={addLeadPreselectedStage}
      />

      {/* Import CSV Modal */}
      <CrmImportCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadCrmData}
        showNotification={showNotification}
      />

      {/* Lead Detail Drawer */}
      <CrmLeadDetailDrawer
        lead={selectedLead}
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedLead(null);
        }}
        onRefreshLead={loadCrmData}
        onCall={handleCall}
        onWhatsApp={handleWhatsApp}
        onConvert={(l) => {
          setIsDetailDrawerOpen(false);
          setLeadToConvert(l);
        }}
        onMarkLost={(l) => {
          setIsDetailDrawerOpen(false);
          setLeadToMarkLost(l);
        }}
        showNotification={showNotification}
      />

      {/* Convert to Patient Modal */}
      <CrmConvertPatientModal
        lead={leadToConvert}
        isOpen={!!leadToConvert}
        onClose={() => setLeadToConvert(null)}
        onSuccess={loadCrmData}
        showNotification={showNotification}
      />

      {/* Mark Lost Modal */}
      <CrmMarkLostModal
        lead={leadToMarkLost}
        isOpen={!!leadToMarkLost}
        onClose={() => setLeadToMarkLost(null)}
        onSuccess={loadCrmData}
        showNotification={showNotification}
      />

      {/* Schedule Follow-up Modal */}
      <CrmScheduleFollowupModal
        lead={leadToScheduleFollowup}
        isOpen={!!leadToScheduleFollowup}
        onClose={() => setLeadToScheduleFollowup(null)}
        onSuccess={loadCrmData}
        showNotification={showNotification}
      />
    </div>
  );
}
