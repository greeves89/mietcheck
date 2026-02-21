"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, AlertTriangle, CheckCircle2, Trash2, Download, Crown, Check, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";

const inputClass = "w-full rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors";
const labelClass = "text-[11px] font-medium text-muted-foreground/70 mb-1.5 block";

export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();
  const [name, setName] = useState(user?.name || "");
  const [street, setStreet] = useState(user?.address_street || "");
  const [zip, setZip] = useState(user?.address_zip || "");
  const [city, setCity] = useState(user?.address_city || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSaveSuccess(false);
    try {
      const updated = await api.updateMe({ name, address_street: street || null, address_zip: zip || null, address_city: city || null });
      setUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    const res = await api.exportData();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mietcheck-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Konto wirklich löschen? Alle Daten werden unwiderruflich gelöscht.")) return;
    if (!confirm("Sind Sie sicher? Dies kann nicht rückgängig gemacht werden!")) return;
    try {
      await api.deleteAccount();
      logout();
      router.push("/login");
    } catch (e) {
      alert("Fehler beim Löschen");
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    setError("");
    try {
      const data = await api.createCheckoutSession();
      window.location.href = data.checkout_url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Fehler beim Starten des Checkout");
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Abonnement wirklich kündigen? Es bleibt bis zum Ende der Laufzeit aktiv.")) return;
    setCancelling(true);
    setError("");
    try {
      await api.cancelSubscription();
      alert("Ihr Abonnement wird am Ende der Laufzeit gekündigt.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Fehler beim Kündigen");
    } finally {
      setCancelling(false);
    }
  };

  const isPremium = user?.subscription_tier === "premium";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 max-w-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Einstellungen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Profileinstellungen und Datenschutz</p>
          </div>

          <div className="space-y-5">
            {/* Profile */}
            <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold mb-4">Profil</h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className={labelClass}>Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>E-Mail (nicht änderbar)</label>
                  <input type="email" value={user?.email || ""} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
                </div>
                <div>
                  <label className={labelClass}>Straße & Hausnummer (für Widerspruchsbriefe)</label>
                  <input type="text" value={street} onChange={e => setStreet(e.target.value)} className={inputClass} placeholder="Musterstraße 1" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>PLZ</label>
                    <input type="text" value={zip} onChange={e => setZip(e.target.value)} className={inputClass} placeholder="10115" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Stadt</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} placeholder="Berlin" />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <p className="text-[13px] text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-70 transition-all">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Speichern
                  </button>
                  {saveSuccess && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-[13px] text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Gespeichert
                    </motion.span>
                  )}
                </div>
              </form>
            </div>

            {/* Subscription */}
            <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold mb-3">Abonnement</h3>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium capitalize">
                      {isPremium ? "Premium" : "Free"}
                    </p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isPremium ? 'bg-amber-500/20 text-amber-400' : 'bg-foreground/10 text-muted-foreground'}`}>
                      {isPremium ? "Aktiv" : "Kostenlos"}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    {isPremium
                      ? "Unbegrenzte Prüfungen, Widerspruchsbriefe, PDF-Export"
                      : "1 kostenlose Prüfung pro Jahr"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!isPremium && (
                    <button
                      onClick={handleUpgrade}
                      disabled={upgrading}
                      className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-[13px] font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
                    >
                      {upgrading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
                      {upgrading ? "Weiterleitung..." : "Upgrade (0,99€/Monat)"}
                    </button>
                  )}
                  {isPremium && (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                      className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                    >
                      {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      {cancelling ? "Kündige..." : "Abonnement kündigen"}
                    </button>
                  )}
                </div>
              </div>

              {/* Features comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02]">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Free</p>
                  <ul className="space-y-1.5">
                    {["1 Prüfung pro Jahr", "Grundauswertung"].map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <Check className="h-3 w-3 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`p-3 rounded-xl border ${isPremium ? 'border-amber-500/30 bg-amber-500/5' : 'border-foreground/[0.06] bg-foreground/[0.02]'}`}>
                  <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide mb-2">Premium – 0,99€/Monat</p>
                  <ul className="space-y-1.5">
                    {["Unbegrenzte Prüfungen", "Widerspruchsbriefe", "PDF-Export", "KI-Analyse", "Prioritäts-Support"].map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-[12px] text-foreground">
                        <Check className="h-3 w-3 text-amber-400 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* DSGVO */}
            <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold mb-3">Datenschutz (DSGVO)</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium">Daten exportieren</p>
                    <p className="text-[12px] text-muted-foreground">Alle Ihre Daten als JSON herunterladen (Art. 20 DSGVO)</p>
                  </div>
                  <button onClick={handleExport} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                </div>
                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-red-400">Konto löschen</p>
                    <p className="text-[12px] text-muted-foreground">Alle Daten unwiderruflich löschen (Art. 17 DSGVO)</p>
                  </div>
                  <button onClick={handleDeleteAccount} className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/20 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
