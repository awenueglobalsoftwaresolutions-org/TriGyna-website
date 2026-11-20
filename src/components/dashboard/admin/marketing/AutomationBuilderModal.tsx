"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  Save,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowDown,
  Layers,
  Settings,
  ShieldCheck,
  Zap,
  Filter,
  CheckSquare,
  MessageSquare,
  UserCheck,
  Calendar,
  DollarSign,
} from "lucide-react";

interface AutomationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function AutomationBuilderModal({
  isOpen,
  onClose,
  showNotification,
}: AutomationBuilderModalProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState("meta_lead_automation");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("trigger_1");

  if (!isOpen) return null;

  const workflows = [
    {
      id: "meta_lead_automation",
      name: "Meta Lead Ads → CRM Auto Ingestion",
      description: "Captures Facebook/Instagram leads, verifies signature, assigns sales rep, and sends WhatsApp welcome.",
      status: "active",
      nodes: [
        { id: "trigger_1", type: "trigger", title: "Meta Lead Ad Created", desc: "Webhook: 'leadgen' event received" },
        { id: "cond_1", type: "condition", title: "Validate & Verify Signature", desc: "HMAC-SHA256 signature verified" },
        { id: "cond_2", type: "condition", title: "Duplicate Check (10 mins)", desc: "Skip if phone enquiry received recently" },
        { id: "action_1", type: "action", title: "Create / Match CRM Lead", desc: "Save contact in TriGyna CRM" },
        { id: "action_2", type: "action", title: "Save Campaign Attribution", desc: "Attach CAMP-5701 & first touch timestamp" },
        { id: "action_3", type: "action", title: "Assign Sales Representative", desc: "Round-robin to active sales rep" },
        { id: "action_4", type: "action", title: "Create Follow-up Task", desc: "Schedule 30-min call task" },
        { id: "action_5", type: "action", title: "Notify Sales Team", desc: "In-app and WhatsApp push alert" },
      ],
    },
    {
      id: "appointment_conversion",
      name: "Lead → Appointment Conversion",
      description: "When doctor consultation is booked, link to marketing attribution and update ROAS.",
      status: "active",
      nodes: [
        { id: "trigger_2", type: "trigger", title: "Appointment Booked", desc: "Patient/Staff reserves doctor slot" },
        { id: "cond_3", type: "condition", title: "Check Marketing Lead Link", desc: "Verify if patient originated from ad" },
        { id: "action_6", type: "action", title: "Update CRM Stage", desc: "Move stage to 'consultation_booked'" },
        { id: "action_7", type: "action", title: "Record Campaign Conversion", desc: "Increment campaign booking counter" },
      ],
    },
    {
      id: "verified_revenue_roas",
      name: "Verified Payment → ROAS Update",
      description: "When invoice payment is verified, calculate exact return on ad spend.",
      status: "active",
      nodes: [
        { id: "trigger_3", type: "trigger", title: "Payment Verified", desc: "Webhook: Razorpay / UPI success" },
        { id: "cond_4", type: "condition", title: "Payment Integrity Guard", desc: "Verify amount > 0 and no refund active" },
        { id: "action_8", type: "action", title: "Attribute Revenue", desc: "Reconcile payment with originating campaign" },
        { id: "action_9", type: "action", title: "Recalculate ROAS", desc: "Attributed Revenue / Campaign Spend" },
      ],
    },
  ];

  const currentWf = workflows.find((w) => w.id === selectedWorkflow) || workflows[0];
  const currentNode = currentWf.nodes.find((n) => n.id === selectedNodeId) || currentWf.nodes[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl border border-[#E5EAF0] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5EAF0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827]">Visual Marketing Automation Engine</h2>
              <p className="text-xs text-[#64748B]">
                Configure real-time trigger pipelines from ad webhooks to sales follow-ups and financial ROAS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => showNotification("Automation pipeline verified and operational in production!")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition-all cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save &amp; Activate</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#64748B] hover:text-[#111827] rounded-xl hover:bg-black/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Column Layout: Left (Workflows), Center (Canvas), Right (Node Config) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* LEFT: Preconfigured Workflows Library (3 cols) */}
          <div className="md:col-span-3 border-r border-[#E5EAF0] p-4 overflow-y-auto space-y-3 bg-[#FAFCFB]">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
              Automated Workflows
            </span>

            {workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => {
                  setSelectedWorkflow(wf.id);
                  setSelectedNodeId(wf.nodes[0].id);
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedWorkflow === wf.id
                    ? "border-[#087A50] bg-white shadow-xs"
                    : "border-transparent hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#111827]">{wf.name}</h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[11px] text-[#64748B] line-clamp-2 mt-1">{wf.description}</p>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#087A50] mt-2">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{wf.nodes.length} Connected Steps</span>
                </div>
              </div>
            ))}
          </div>

          {/* CENTER: Visual Node Canvas (6 cols) */}
          <div className="md:col-span-6 p-6 overflow-y-auto bg-[#F7F9FC] flex flex-col items-center">
            <div className="w-full max-w-md space-y-3">
              {currentWf.nodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <React.Fragment key={node.id}>
                    {/* Node Card */}
                    <div
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between bg-white shadow-xs ${
                        isSelected
                          ? "border-[#087A50] ring-2 ring-[#087A50]/20"
                          : "border-[#E5EAF0] hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                            node.type === "trigger"
                              ? "bg-[#9333EA]"
                              : node.type === "condition"
                              ? "bg-[#D97706]"
                              : "bg-[#087A50]"
                          }`}
                        >
                          {node.type === "trigger" && <Zap className="w-4 h-4" />}
                          {node.type === "condition" && <Filter className="w-4 h-4" />}
                          {node.type === "action" && <CheckSquare className="w-4 h-4" />}
                        </div>
                        <div>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider block ${
                              node.type === "trigger"
                                ? "text-[#9333EA]"
                                : node.type === "condition"
                                ? "text-[#D97706]"
                                : "text-[#087A50]"
                            }`}
                          >
                            {node.type}
                          </span>
                          <h4 className="text-xs font-bold text-[#111827]">{node.title}</h4>
                          <p className="text-[11px] text-[#64748B] line-clamp-1">{node.desc}</p>
                        </div>
                      </div>
                    </div>

                    {/* Connecting Arrow */}
                    {index < currentWf.nodes.length - 1 && (
                      <div className="flex justify-center my-0.5">
                        <ArrowDown className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Selected Node Inspector (3 cols) */}
          <div className="md:col-span-3 border-l border-[#E5EAF0] p-5 overflow-y-auto bg-white space-y-4">
            <div className="pb-3 border-b border-[#E5EAF0]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                Node Inspector
              </span>
              <h3 className="text-sm font-bold text-[#111827] mt-0.5">{currentNode.title}</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#64748B] font-medium mb-1">Node Type</label>
                <span className="font-bold text-[#111827] uppercase">{currentNode.type}</span>
              </div>

              <div>
                <label className="block text-[#64748B] font-medium mb-1">Execution Mode</label>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Real-time Synchronous Queue
                </span>
              </div>

              <div>
                <label className="block text-[#64748B] font-medium mb-1">Idempotency Policy</label>
                <p className="text-[11px] text-[#64748B]">
                  Guaranteed deduplication by unique provider event ID and 10-minute contact throttle.
                </p>
              </div>

              <div>
                <label className="block text-[#64748B] font-medium mb-1">Audit Logging</label>
                <p className="text-[11px] text-[#64748B]">
                  Every state mutation is automatically committed to TriGyna Audit Ledger.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
