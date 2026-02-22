"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, AlertTriangle, Camera, Upload, X, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { RentalContract } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PositionForm, PositionData } from "./position-form";

interface BillWizardProps {
  contracts: RentalContract[];
}

const inputClass = "w-full rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 transition-colors";
const labelClass = "text-[11px] font-medium text-muted-foreground/70 mb-1.5 block";

const STEPS = ["Foto-Upload", "Grunddaten", "Kostenpositionen", "Prüfen"];

export function BillWizard({ contracts }: BillWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [error, setError] = useState("");
  const [ocrError, setOcrError] = useState("");
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [ocrApplied, setOcrApplied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 data (Grunddaten)
  const [contractId, setContractId] = useState(contracts[0]?.id?.toString() || "");
  const [billingYear, setBillingYear] = useState(new Date().getFullYear() - 1 + "");
  const [periodStart, setPeriodStart] = useState(`${new Date().getFullYear() - 1}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(`${new Date().getFullYear() - 1}-12-31`);
  const [receivedDate, setReceivedDate] = useState("");
  const [totalCosts, setTotalCosts] = useState("");
  const [totalAdvance, setTotalAdvance] = useState("");
  const [resultAmount, setResultAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Step 3 data (Positionen)
  const [positions, setPositions] = useState<PositionData[]>([]);

  const canNext = () => {
    if (step === 0) return true; // OCR step is always skippable
    if (step === 1) return contractId && billingYear && periodStart && periodEnd;
    if (step === 2) return true;
    return false;
  };

  const handleFileSelect = (file: File) => {
    setOcrError("");
    setOcrFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setOcrPreview(url);
    } else {
      setOcrPreview(null);
    }
  };

  const handleOcrExtract = async () => {
    if (!ocrFile) return;
    setIsOcrLoading(true);
    setOcrError("");
    try {
      const extracted = await api.ocrExtractBill(ocrFile);

      // Apply extracted data to form fields
      if (extracted.billing_year) setBillingYear(String(extracted.billing_year));
      if (extracted.billing_period_start) setPeriodStart(extracted.billing_period_start);
      if (extracted.billing_period_end) setPeriodEnd(extracted.billing_period_end);
      if (extracted.received_date) setReceivedDate(extracted.received_date);
      if (extracted.total_costs != null) setTotalCosts(String(extracted.total_costs));
      if (extracted.total_advance_paid != null) setTotalAdvance(String(extracted.total_advance_paid));
      if (extracted.result_amount != null) setResultAmount(String(extracted.result_amount));

      if (extracted.positions && Array.isArray(extracted.positions)) {
        const mapped: PositionData[] = extracted.positions
          .filter((p: any) => p.name && p.total_amount > 0)
          .map((p: any) => ({
            category: p.category || "other",
            name: p.name || "",
            total_amount: p.total_amount != null ? String(p.total_amount) : "",
            distribution_key: "sqm",
            tenant_share_percent: "",
            tenant_amount: p.tenant_amount != null ? String(p.tenant_amount) : "",
          }));
        setPositions(mapped);
      }

      setOcrApplied(true);
      // Auto-advance to Grunddaten step
      setStep(1);
    } catch (e) {
      if (e instanceof ApiError) {
        setOcrError(e.message);
      } else {
        setOcrError("OCR-Extraktion fehlgeschlagen. Bitte Foto wiederholen oder manuell eingeben.");
      }
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");
    try {
      const payload = {
        contract_id: parseInt(contractId),
        billing_year: parseInt(billingYear),
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        received_date: receivedDate || null,
        total_costs: totalCosts ? parseFloat(totalCosts) : null,
        total_advance_paid: totalAdvance ? parseFloat(totalAdvance) : null,
        result_amount: resultAmount ? parseFloat(resultAmount) : null,
        notes: notes || null,
        positions: positions.map((p) => ({
          category: p.category,
          name: p.name,
          total_amount: parseFloat(p.total_amount) || 0,
          distribution_key: p.distribution_key || null,
          tenant_share_percent: p.tenant_share_percent ? parseFloat(p.tenant_share_percent) : null,
          tenant_amount: p.tenant_amount ? parseFloat(p.tenant_amount) : null,
        })).filter((p) => p.name && p.total_amount > 0),
      };

      const bill = await api.createBill(payload);
      router.push(`/bills/${bill.id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Ein Fehler ist aufgetreten");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-all",
              i < step ? "bg-emerald-500 text-white" : i === step ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-[13px] font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px w-8 mx-1 transition-colors", i < step ? "bg-emerald-500" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: OCR Upload */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Abrechnung automatisch einlesen</h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    Laden Sie ein Foto oder einen Scan Ihrer Nebenkostenabrechnung hoch. Wir lesen die Daten automatisch aus.
                  </p>
                </div>
              </div>

              {!ocrFile ? (
                <div
                  className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.02] p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.04] transition-all"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect(file);
                  }}
                >
                  <Camera className="h-10 w-10 text-primary/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground/80">Foto oder Scan hochladen</p>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    JPEG, PNG, WebP oder PDF · max. 10 MB
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Klicken oder per Drag & Drop
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {ocrPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-foreground/[0.06]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ocrPreview} alt="Abrechnung Vorschau" className="w-full max-h-64 object-contain bg-muted/20" />
                      <button
                        type="button"
                        onClick={() => { setOcrFile(null); setOcrPreview(null); setOcrApplied(false); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center border border-border hover:bg-background transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-card/60 p-3">
                      <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <Upload className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ocrFile.name}</p>
                        <p className="text-[12px] text-muted-foreground">{(ocrFile.size / 1024).toFixed(0)} KB · PDF</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setOcrFile(null); setOcrPreview(null); setOcrApplied(false); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {ocrApplied ? (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <p className="text-[13px] text-emerald-400">Daten erfolgreich ausgelesen! Bitte prüfen und ggf. korrigieren.</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOcrExtract}
                      disabled={isOcrLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-70 transition-all"
                    >
                      {isOcrLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Abrechnung wird analysiert...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Daten automatisch auslesen
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {ocrError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[13px] text-red-400">{ocrError}</p>
                </div>
              )}

              <p className="text-[12px] text-muted-foreground/60 text-center">
                Dieser Schritt ist optional – Sie können auch manuell eingeben.
              </p>
            </div>
          </motion.div>
        )}

        {/* Step 1: Grunddaten */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-6 space-y-4">
              {ocrApplied && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 p-3">
                  <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-[13px] text-primary">Felder wurden vom OCR vorausgefüllt. Bitte prüfen und korrigieren.</p>
                </div>
              )}
              <h2 className="text-base font-semibold">Grunddaten der Abrechnung</h2>

              <div>
                <label className={labelClass}>Mietverhältnis</label>
                <select value={contractId} onChange={(e) => setContractId(e.target.value)} className={inputClass}>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>{c.property_address} ({c.apartment_size_sqm} m²)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Abrechnungsjahr</label>
                  <input type="number" value={billingYear} onChange={(e) => setBillingYear(e.target.value)} min="2000" max="2030" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Zugangsdatum (Erhalt)</label>
                  <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Abrechnungszeitraum von</label>
                  <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Abrechnungszeitraum bis</label>
                  <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Gesamtkosten laut Abrechnung (€)</label>
                  <input type="number" step="0.01" value={totalCosts} onChange={(e) => setTotalCosts(e.target.value)} placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Geleistete Vorauszahlungen (€)</label>
                  <input type="number" step="0.01" value={totalAdvance} onChange={(e) => setTotalAdvance(e.target.value)} placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nachzahlung (+) / Guthaben (−) (€)</label>
                  <input type="number" step="0.01" value={resultAmount} onChange={(e) => setResultAmount(e.target.value)} placeholder="0.00" className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Notizen (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="Eigene Notizen..." />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Positionen */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-6">
              <h2 className="text-base font-semibold mb-1">Kostenpositionen erfassen</h2>
              <p className="text-[13px] text-muted-foreground mb-4">
                {ocrApplied && positions.length > 0
                  ? "OCR hat die folgenden Positionen erkannt. Bitte prüfen und ergänzen."
                  : "Tragen Sie die einzelnen Positionen aus der Abrechnung ein. Je genauer, desto besser die Prüfung."}
              </p>
              <PositionForm positions={positions} onChange={setPositions} />
            </div>
          </motion.div>
        )}

        {/* Step 3: Submit */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-6">
              <h2 className="text-base font-semibold mb-1">Prüfung starten</h2>
              <p className="text-[13px] text-muted-foreground mb-4">
                Wir prüfen jetzt Ihre Abrechnung auf Fehler, Fristüberschreitungen und unzulässige Positionen.
              </p>

              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Abrechnungsjahr</span>
                  <span className="font-medium">{billingYear}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Zeitraum</span>
                  <span className="font-medium">{periodStart} – {periodEnd}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Positionen</span>
                  <span className="font-medium">{positions.filter(p => p.name && p.total_amount).length}</span>
                </div>
                {totalCosts && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Gesamtbetrag</span>
                    <span className="font-medium">{parseFloat(totalCosts).toFixed(2)} €</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[13px] text-red-400">{error}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          Zurück
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {step === 0 ? "Manuell eingeben" : "Weiter"}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-70 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Prüfung läuft...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Jetzt prüfen
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
