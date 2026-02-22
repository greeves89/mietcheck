"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileSearch, AlertTriangle, TrendingUp, FileText,
  PlusCircle, ArrowRight, Home, Star, Crown
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { CostBreakdownChart } from "@/components/dashboard/cost-breakdown-chart";
import { CostTrendChart } from "@/components/dashboard/cost-trend-chart";
import { BillCard } from "@/components/bills/bill-card";
import { useAuthStore } from "@/lib/auth";
import { useBills } from "@/hooks/use-bills";
import { useContracts } from "@/hooks/use-contracts";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { bills, isLoading: billsLoading } = useBills();
  const { contracts } = useContracts();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      // Refresh user profile to reflect new subscription status
      api.getMe().then((freshUser) => {
        setUser(freshUser);
        setUpgradeSuccess(true);
        setTimeout(() => setUpgradeSuccess(false), 5000);
      }).catch(() => {});
      // Remove query param without page reload
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, setUser, router]);

  const totalErrors = bills.reduce((sum, b) => sum + b.check_results.filter(r => r.severity === "error").length, 0);
  const avgScore = bills.length > 0
    ? Math.round(bills.filter(b => b.check_score !== null).reduce((sum, b) => sum + (b.check_score || 0), 0) / bills.filter(b => b.check_score !== null).length)
    : 0;
  const objectionCount = bills.filter(b => b.status === "objection_sent").length;
  const recentBills = bills.slice(0, 5);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Upgrade success banner */}
          {upgradeSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
            >
              <Crown className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-300">
                Willkommen bei Premium! Alle Funktionen sind jetzt freigeschaltet.
              </p>
            </motion.div>
          )}

          {/* Welcome */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h2 className="text-xl font-bold">Willkommen, {user?.name?.split(" ")[0]}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user?.subscription_tier === "free"
                ? "Free-Tarif: 1 Abrechnung kostenlos"
                : "Premium: Unbegrenzte Prüfungen"}
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard title="Geprüfte Abrechnungen" value={bills.length} icon={FileSearch} color="blue" index={0} />
            <StatsCard title="Fehler gefunden" value={totalErrors} icon={AlertTriangle} color="red" index={1} description="Über alle Prüfungen" />
            <StatsCard title="Ø Prüfscore" value={bills.length > 0 ? `${avgScore}/100` : "–"} icon={TrendingUp} color="green" index={2} />
            <StatsCard title="Widerspruchsbriefe" value={objectionCount} icon={FileText} color="purple" index={3} />
          </div>

          {/* Premium upsell for free users */}
          {user?.subscription_tier === "free" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-4 flex items-center gap-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 flex-shrink-0">
                <Star className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-400">Upgrade auf Premium</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Nur 0,99€/Monat: Unbegrenzte Prüfungen, Widerspruchsbriefe, PDF-Export, Vergleichswerte
                </p>
              </div>
              <button className="rounded-xl bg-amber-500 px-4 py-2 text-[13px] font-semibold text-black hover:bg-amber-400 transition-colors flex-shrink-0">
                Upgrade
              </button>
            </motion.div>
          )}

          {/* Charts - only shown when there are bills */}
          {bills.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Kostenentwicklung</p>
                <CostTrendChart bills={bills} />
              </div>
              <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Kostenverteilung</p>
                <CostBreakdownChart bills={bills} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Bills */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Letzte Abrechnungen</h3>
                <Link href="/bills" className="flex items-center gap-1 text-[13px] text-primary hover:text-primary/80 transition-colors">
                  Alle anzeigen <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {billsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
                  ))}
                </div>
              ) : recentBills.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
                  <FileSearch className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm font-medium">Noch keine Abrechnungen</p>
                  <p className="text-[13px] text-muted-foreground">Starten Sie Ihre erste Prüfung</p>
                  <Link href="/bills/new" className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all mt-1">
                    <PlusCircle className="h-4 w-4" />
                    Erste Abrechnung prüfen
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBills.map((bill, i) => <BillCard key={bill.id} bill={bill} index={i} />)}
                </div>
              )}
            </div>

            {/* Sidebar panel */}
            <div className="space-y-4">
              {/* Quick actions */}
              <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Schnellzugriff</p>
                <div className="space-y-2">
                  <Link href="/bills/new" className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors text-[13px] font-medium">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                      <PlusCircle className="h-4 w-4 text-blue-400" />
                    </div>
                    Abrechnung prüfen
                  </Link>
                  <Link href="/contracts" className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors text-[13px] font-medium">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Home className="h-4 w-4 text-emerald-400" />
                    </div>
                    Mietverhältnis anlegen
                  </Link>
                </div>
              </div>

              {/* Contracts overview */}
              <div className="rounded-xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Mietverhältnisse</p>
                {contracts.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">Keine Mietverhältnisse angelegt.</p>
                ) : (
                  <div className="space-y-2">
                    {contracts.slice(0, 3).map((c) => (
                      <div key={c.id} className="text-[13px]">
                        <p className="font-medium truncate">{c.property_address}</p>
                        <p className="text-muted-foreground text-[11px]">{c.apartment_size_sqm} m² · {c.landlord_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
