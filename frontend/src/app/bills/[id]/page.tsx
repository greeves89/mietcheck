"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Trash2, RefreshCw, FileText, Download,
  Calendar, Euro, AlertTriangle, CheckCircle2, Loader2
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CheckResults } from "@/components/bills/check-results";
import { useBill } from "@/hooks/use-bills";
import { useAuthStore } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { cn, formatCurrency, formatDate, scoreBgColor, CATEGORY_LABELS } from "@/lib/utils";
import Link from "next/link";

const OBJECTION_REASONS = [
  "Die Abrechnung enthält Rechenfehler",
  "Die Abrechnungsfrist wurde überschritten (§ 556 Abs. 3 BGB)",
  "Nicht umlagefähige Kosten wurden eingestellt",
  "Die Kosten übersteigen die üblichen Vergleichswerte erheblich",
  "Der Verteilerschlüssel ist nicht nachvollziehbar",
  "Belege wurden nicht beigefügt und werden angefordert",
  "Heizkosten wurden nicht nach der Heizkostenverordnung abgerechnet",
];

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);
  const { bill, isLoading, error, reload } = useBill(id);
  const user = useAuthStore((s) => s.user);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);
  const [showObjectionModal, setShowObjectionModal] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [letterError, setLetterError] = useState("");

  const handleDelete = async () => {
    if (!confirm("Abrechnung wirklich löschen?")) return;
    setIsDeleting(true);
    try {
      await api.deleteBill(id);
      router.push("/bills");
    } catch (e) {
      setIsDeleting(false);
    }
  };

  const handleRecheck = async () => {
    setIsRechecking(true);
    try {
      await api.recheckBill(id);
      await reload();
    } finally {
      setIsRechecking(false);
    }
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleGenerateLetter = async () => {
    if (selectedReasons.length === 0) return;
    setIsGeneratingLetter(true);
    setLetterError("");
    try {
      await api.createObjection(id, selectedReasons);
      setShowObjectionModal(false);
      await reload();
    } catch (e) {
      setLetterError(e instanceof ApiError ? e.message : "Fehler beim Erstellen");
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 ml-[260px] flex flex-col min-h-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!bill || error) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 ml-[260px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Abrechnung nicht gefunden</p>
            <Link href="/bills" className="mt-3 inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Zurück
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPremium = user?.subscription_tier === "premium" || user?.role === "admin";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Back + actions */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/bills" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRecheck}
                disabled={isRechecking}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRechecking && "animate-spin")} />
                Erneut prüfen
              </button>
              {isPremium && (
                <button
                  onClick={() => setShowObjectionModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[13px] font-medium text-amber-400 hover:bg-amber-500/20 transition-all"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Widerspruchsbrief
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] font-medium text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Löschen
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Info + Positions */}
            <div className="lg:col-span-1 space-y-4">
              {/* Bill info */}
              <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5">
                <h2 className="text-base font-semibold mb-4">Abrechnung {bill.billing_year}</h2>
                <div className="space-y-3 text-[13px]">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(bill.billing_period_start)} – {formatDate(bill.billing_period_end)}</span>
                  </div>
                  {bill.received_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Erhalten: {formatDate(bill.received_date)}</span>
                    </div>
                  )}
                  {bill.total_costs && (
                    <div className="flex items-center gap-2">
                      <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Gesamt: <span className="font-semibold">{formatCurrency(bill.total_costs)}</span></span>
                    </div>
                  )}
                  {bill.total_advance_paid && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Euro className="h-3.5 w-3.5" />
                      <span>Vorauszahlungen: {formatCurrency(bill.total_advance_paid)}</span>
                    </div>
                  )}
                  {bill.result_amount !== undefined && bill.result_amount !== null && (
                    <div className={cn(
                      "rounded-lg p-3 border",
                      parseFloat(bill.result_amount) > 0
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-emerald-500/10 border-emerald-500/20"
                    )}>
                      <p className="text-[11px] text-muted-foreground">
                        {parseFloat(bill.result_amount) > 0 ? "Nachzahlung" : "Guthaben"}
                      </p>
                      <p className={cn(
                        "text-lg font-bold mt-0.5",
                        parseFloat(bill.result_amount) > 0 ? "text-red-400" : "text-emerald-400"
                      )}>
                        {formatCurrency(Math.abs(parseFloat(bill.result_amount)))}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Positions */}
              {bill.positions.length > 0 && (
                <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5">
                  <h3 className="text-sm font-semibold mb-3">Kostenpositionen ({bill.positions.length})</h3>
                  <div className="space-y-2">
                    {bill.positions.map((pos) => (
                      <div key={pos.id} className={cn(
                        "flex items-center justify-between rounded-lg p-2.5 text-[13px]",
                        pos.is_plausible === false ? "bg-yellow-500/5 border border-yellow-500/20" : "bg-muted/20"
                      )}>
                        <div>
                          <p className="font-medium">{pos.name}</p>
                          <p className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[pos.category] || pos.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(pos.tenant_amount)}</p>
                          {pos.tenant_share_percent && (
                            <p className="text-[11px] text-muted-foreground">{pos.tenant_share_percent}%</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Check Results */}
            <div className="lg:col-span-2">
              {bill.check_results.length > 0 ? (
                <CheckResults results={bill.check_results} score={bill.check_score ?? 0} />
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
                  <RefreshCw className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm font-medium">Noch nicht geprüft</p>
                  <button onClick={handleRecheck} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    Prüfung starten
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Objection Letter Modal */}
      {showObjectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl border border-foreground/[0.06] bg-card p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Widerspruchsbrief erstellen</h3>
              <button onClick={() => setShowObjectionModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <p className="text-[13px] text-muted-foreground mb-4">
              Wählen Sie die Gründe für Ihren Widerspruch:
            </p>

            <div className="space-y-2 mb-4">
              {OBJECTION_REASONS.map((reason) => (
                <label key={reason} className="flex items-start gap-3 cursor-pointer rounded-lg p-2.5 hover:bg-accent/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(reason)}
                    onChange={() => toggleReason(reason)}
                    className="mt-0.5"
                  />
                  <span className="text-[13px]">{reason}</span>
                </label>
              ))}
            </div>

            {letterError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 mb-4">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-[13px] text-red-400">{letterError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowObjectionModal(false)} className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                Abbrechen
              </button>
              <button
                onClick={handleGenerateLetter}
                disabled={selectedReasons.length === 0 || isGeneratingLetter}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {isGeneratingLetter ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Brief erstellen
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
