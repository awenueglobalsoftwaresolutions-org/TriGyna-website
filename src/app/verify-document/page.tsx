"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Lock,
  Search,
  QrCode,
  Camera,
  Upload,
  RefreshCw,
  Printer,
  XCircle,
  Clock,
  HelpCircle,
  FileText,
  Receipt as ReceiptIcon,
} from "lucide-react";
import jsQR from "jsqr";
import { api } from "@/lib/api/client";

interface VerificationDTO {
  verified: boolean;
  outcome:
    | "fully_paid"
    | "payment_pending"
    | "partially_paid"
    | "cancelled"
    | "refunded"
    | "inconsistent_record"
    | "not_found";
  outcomeLabel: string;
  documentType?: "invoice" | "receipt";
  documentNumber?: string;
  invoiceNumber?: string;
  issueDate?: string;
  organizationName?: string;
  serviceCategory?: string;
  totalAmount?: number;
  amountPaid?: number;
  balanceAmount?: number;
  currency?: string;
  paymentStatus?: string;
  documentStatus?: string;
  maskedPatient?: string;
  consultantName?: string;
  verificationTimestamp?: string;
  message?: string;
}

function VerifyDocumentContent() {
  const searchParams = useSearchParams();
  const initialRef =
    searchParams.get("ref") ||
    searchParams.get("token") ||
    searchParams.get("doc") ||
    searchParams.get("id") ||
    "";

  const [inputRef, setInputRef] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scanning mode states
  const [scanTab, setScanTab] = useState<"manual" | "camera" | "upload">("manual");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const performVerification = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      setErrorMsg("Please enter a valid document number or verification token.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    // Stop camera if running
    stopCamera();

    try {
      const res = await api.get<VerificationDTO>(
        `/public/document-verification/${encodeURIComponent(trimmed)}`
      );

      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setResult({
          verified: false,
          outcome: "not_found",
          outcomeLabel: "Document Not Found",
          message:
            typeof res.error === "string"
              ? res.error
              : res.error?.message ||
                "No matching official TriGyna invoice or receipt was found for this verification reference.",
          verificationTimestamp: new Date().toISOString(),
        });
      }
    } catch {
      setErrorMsg("Unable to contact verification service. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify on mount if search parameter provided
  useEffect(() => {
    if (initialRef) {
      setInputRef(initialRef);
      performVerification(initialRef);
    }
  }, [initialRef]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(
        "Camera permission denied or camera unavailable. Please enter the document number manually or upload a QR image."
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        // Extract token or document number from URL or direct text
        let extracted = code.data.trim();
        try {
          if (extracted.startsWith("http://") || extracted.startsWith("https://")) {
            const urlObj = new URL(extracted);
            extracted =
              urlObj.searchParams.get("ref") ||
              urlObj.searchParams.get("token") ||
              urlObj.pathname.split("/").pop() ||
              extracted;
          }
        } catch {
          // ignore URL parsing error
        }

        setInputRef(extracted);
        stopCamera();
        setScanTab("manual");
        performVerification(extracted);
        return;
      }
    }

    animFrameId.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          let extracted = code.data.trim();
          try {
            if (extracted.startsWith("http://") || extracted.startsWith("https://")) {
              const urlObj = new URL(extracted);
              extracted =
                urlObj.searchParams.get("ref") ||
                urlObj.searchParams.get("token") ||
                urlObj.pathname.split("/").pop() ||
                extracted;
            }
          } catch {
            // ignore
          }
          setInputRef(extracted);
          setScanTab("manual");
          performVerification(extracted);
        } else {
          setErrorMsg("Could not detect a valid QR code in the uploaded image. Please try another image or enter manually.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const renderOutcomeBadge = () => {
    if (!result) return null;

    switch (result.outcome) {
      case "fully_paid":
        return (
          <div className="bg-[#EDF8F1] border border-[#C6EAD3] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#087443] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#064A2D]">
                {result.outcomeLabel || "AUTHENTICATED & FULLY PAID"}
              </h2>
              <p className="text-[11px] text-[#087443] mt-0.5">
                Official TriGyna medical billing record verified against authoritative database ledger.
              </p>
            </div>
          </div>
        );
      case "payment_pending":
        return (
          <div className="bg-[#FFF8EC] border border-[#FBEAD2] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#D97706] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#92400E]">
                {result.outcomeLabel || "AUTHENTICATED INVOICE — PAYMENT PENDING"}
              </h2>
              <p className="text-[11px] text-[#B45309] mt-0.5">
                Authentic invoice record found. No successful payment has been recorded for this balance yet.
              </p>
            </div>
          </div>
        );
      case "partially_paid":
        return (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1E40AF]">
                {result.outcomeLabel || "AUTHENTICATED RECORD — PARTIALLY PAID"}
              </h2>
              <p className="text-[11px] text-[#1D4ED8] mt-0.5">
                Initial installment captured. An outstanding balance remains due on this invoice.
              </p>
            </div>
          </div>
        );
      case "cancelled":
        return (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#DC2626] text-white flex items-center justify-center shrink-0 shadow-xs">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#991B1B]">
                {result.outcomeLabel || "CANCELLED OR VOIDED DOCUMENT"}
              </h2>
              <p className="text-[11px] text-[#B91C1C] mt-0.5">
                This document has been officially marked as cancelled/voided in the TriGyna system.
              </p>
            </div>
          </div>
        );
      case "refunded":
        return (
          <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-xs">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#6B21A8]">
                {result.outcomeLabel || "REFUNDED OR REVERSED RECORD"}
              </h2>
              <p className="text-[11px] text-[#7E22CE] mt-0.5">
                This transaction has been refunded back to the patient.
              </p>
            </div>
          </div>
        );
      case "inconsistent_record":
        return (
          <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#9A3412]">
                {result.outcomeLabel || "RECORD INCONSISTENCY DETECTED"}
              </h2>
              <p className="text-[11px] text-[#C2410C] mt-0.5">
                Financial records require administrative review. Please contact clinic accounts desk.
              </p>
            </div>
          </div>
        );
      case "not_found":
      default:
        return (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#64748B] text-white flex items-center justify-center shrink-0 shadow-xs">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#334155]">
                {result.outcomeLabel || "DOCUMENT NOT FOUND IN LEDGER"}
              </h2>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                {result.message || "No official TriGyna invoice or receipt matches this reference."}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FAF6] flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block transition hover:opacity-90">
            <Image
              src="/images/brand/logo.webp"
              alt="TriGyna Women Health &amp; Wellness"
              width={160}
              height={48}
              className="h-10 w-auto mx-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#087443] font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#087443]" />
            <span>Official Document Verification & Authenticity Portal</span>
          </div>
          <p className="text-xs text-[#68766F] max-w-md mx-auto">
            Scan your QR code or enter document identifiers to authenticate official invoices, bills, and payment receipts.
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-3xl border border-[#E4EEE7] p-6 sm:p-8 shadow-xs space-y-6">
          {/* Lookup Method Navigation Tabs */}
          <div className="flex rounded-xl bg-[#F0F5F2] p-1 text-xs font-medium text-[#68766F]">
            <button
              type="button"
              onClick={() => {
                setScanTab("manual");
                stopCamera();
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                scanTab === "manual"
                  ? "bg-white text-[#14251F] font-bold shadow-xs"
                  : "hover:text-[#14251F]"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setScanTab("camera");
                startCamera();
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                scanTab === "camera"
                  ? "bg-white text-[#14251F] font-bold shadow-xs"
                  : "hover:text-[#14251F]"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setScanTab("upload");
                stopCamera();
              }}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                scanTab === "upload"
                  ? "bg-white text-[#14251F] font-bold shadow-xs"
                  : "hover:text-[#14251F]"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload QR</span>
            </button>
          </div>

          {/* Tab 1: Manual Entry Form */}
          {scanTab === "manual" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                performVerification(inputRef);
              }}
              className="space-y-3"
            >
              <label className="block text-xs font-semibold text-[#14251F]">
                Document Number or Cryptographic Token:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputRef}
                    onChange={(e) => setInputRef(e.target.value)}
                    placeholder="e.g. RCP/2026/010055, INV-2026-1157, or QR token"
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-[#D1E0D7] focus:outline-none focus:ring-2 focus:ring-[#087443] focus:border-transparent font-mono placeholder:font-sans placeholder:text-gray-400"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
                <button
                  type="submit"
                  disabled={loading || !inputRef.trim()}
                  className="bg-[#087443] hover:bg-[#065A34] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Verify</span>
                </button>
              </div>
            </form>
          )}

          {/* Tab 2: Camera Scanner */}
          {scanTab === "camera" && (
            <div className="space-y-3 text-center">
              <div className="relative mx-auto w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden border border-[#D1E0D7] flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-2 border-[#087443] rounded-2xl pointer-events-none opacity-70 animate-pulse m-8" />
                {!isCameraActive && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-4 space-y-2">
                    <Camera className="w-8 h-8 text-gray-300" />
                    <p className="text-xs">{cameraError || "Camera is inactive."}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="bg-[#087443] text-white text-xs px-3 py-1.5 rounded-lg mt-2"
                    >
                      Enable Camera
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-[#68766F]">
                Point camera at the QR code printed on your TriGyna billing receipt or tax invoice.
              </p>
            </div>
          )}

          {/* Tab 3: Upload QR Image */}
          {scanTab === "upload" && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#D1E0D7] hover:border-[#087443] rounded-2xl p-8 text-center cursor-pointer transition bg-[#FAFDFB] space-y-2"
              >
                <div className="w-10 h-10 rounded-full bg-[#EDF8F1] text-[#087443] flex items-center justify-center mx-auto">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-[#14251F]">
                  Click to select QR code image
                </div>
                <p className="text-[11px] text-[#68766F]">
                  Supports PNG, JPG, WEBP, or screenshot of invoice QR code.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#087443] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-[#14251F]">
                Querying authoritative TriGyna ledger & cryptographic hash...
              </p>
            </div>
          )}

          {/* Verification Results Panel */}
          {result && !loading && (
            <div className="space-y-5 pt-2 border-t border-[#E4EEE7]">
              {/* Status Header Badge */}
              {renderOutcomeBadge()}

              {/* Verified Details Grid (only shown if document was identified) */}
              {result.outcome !== "not_found" && (
                <div className="divide-y divide-[#E4EEE7] border border-[#E4EEE7] rounded-2xl overflow-hidden text-xs">
                  <div className="p-3.5 bg-[#FAFDFB] flex items-center justify-between">
                    <span className="text-[#68766F] font-medium flex items-center gap-1.5">
                      {result.documentType === "receipt" ? (
                        <ReceiptIcon className="w-3.5 h-3.5 text-[#087443]" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-[#087443]" />
                      )}
                      <span>Verified Document ID:</span>
                    </span>
                    <span className="font-mono font-bold text-[#087443] text-sm">
                      {result.documentNumber}
                    </span>
                  </div>

                  {result.invoiceNumber && result.invoiceNumber !== result.documentNumber && (
                    <div className="p-3.5 flex items-center justify-between">
                      <span className="text-[#68766F]">Associated Tax Invoice:</span>
                      <span className="font-mono font-semibold text-[#14251F]">
                        {result.invoiceNumber}
                      </span>
                    </div>
                  )}

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-[#68766F]">Patient (Privacy Masked):</span>
                    <span className="font-semibold text-[#14251F] flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-[#68766F]" />
                      <span>{result.maskedPatient || "Valued Patient"}</span>
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-[#68766F]">Consultant Doctor:</span>
                    <span className="font-semibold text-[#14251F]">
                      {result.consultantName || "Consultant Doctor"}
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-[#68766F]">Service / Category:</span>
                    <span className="font-medium text-[#14251F]">
                      {result.serviceCategory || "Clinical Consultation & Care"}
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-[#68766F]">Total Document Amount:</span>
                    <span className="font-bold text-[#14251F] text-sm">
                      ₹{Number(result.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-[#68766F]">Verified Amount Paid:</span>
                    <span className="font-bold text-[#087443] text-sm">
                      ₹{Number(result.amountPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {result.balanceAmount !== undefined && result.balanceAmount > 0 && (
                    <div className="p-3.5 bg-amber-50/50 flex items-center justify-between">
                      <span className="text-amber-800 font-medium">Outstanding Balance Due:</span>
                      <span className="font-bold text-amber-700 text-sm">
                        ₹{Number(result.balanceAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="p-3.5 flex items-center justify-between">
                    <span className="text-[#68766F]">Issuance Date:</span>
                    <span className="text-[#14251F]">
                      {result.issueDate
                        ? new Date(result.issueDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Official Record"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#FAFDFB] flex items-center justify-between">
                    <span className="text-[#68766F]">Ledger Verification Time:</span>
                    <span className="font-mono text-[11px] text-[#68766F]">
                      {result.verificationTimestamp
                        ? new Date(result.verificationTimestamp).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })
                        : "Verified"}
                    </span>
                  </div>
                </div>
              )}

              {/* Patient Confidentiality Banner */}
              <div className="p-3.5 rounded-xl bg-[#FFF8EC] border border-[#FBEAD2] text-[11px] text-[#7A6348] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C48924] shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy Protected:</strong> In compliance with healthcare confidentiality regulations,
                  identifying information (phone numbers, full names, home addresses) and clinical diagnoses are masked on public authentication scans.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputRef("");
                    setResult(null);
                    setErrorMsg(null);
                  }}
                  className="text-xs text-[#087443] hover:underline font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Verify Another Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-xs text-[#68766F] hover:text-[#14251F] border border-[#D1E0D7] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs border-t border-[#E4EEE7]">
            <Link
              href="/"
              className="text-[#087443] hover:underline font-semibold flex items-center gap-1"
            >
              <span>TriGyna Official Home</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <Link
              href="/patient/payments"
              className="text-[#68766F] hover:text-[#14251F] transition"
            >
              Patient Billing Portal
            </Link>
          </div>
        </div>

        {/* Footer Guarantee */}
        <p className="text-center text-[11px] text-[#68766F]">
          TriGyna Women Health &amp; Wellness • Pune, Maharashtra, India • www.trigyna.in
        </p>
      </div>
    </div>
  );
}

export default function VerifyDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4FAF6] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#087443] animate-spin" />
        </div>
      }
    >
      <VerifyDocumentContent />
    </Suspense>
  );
}

