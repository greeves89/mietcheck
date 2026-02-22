"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BillWizard } from "@/components/bills/bill-wizard";
import { useContracts } from "@/hooks/use-contracts";
import { useBills } from "@/hooks/use-bills";
import { useAuthStore } from "@/lib/auth";
import Link from "next/link";
import { Home, Plus, Crown } from "lucide-react";

export default function NewBillPage() {
  const { contracts, isLoading } = useContracts();
  const { bills } = useBills();
  const user = useAuthStore((s) => s.user);

  const isFree = user?.subscription_tier !== "premium" && user?.role !== "admin";
  const hasUsedFreeTier = isFree && bills && bills.length >= 1;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Neue Abrechnung prüfen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Geben Sie die Daten Ihrer Nebenkostenabrechnung ein
            </p>
          </div>

          {isLoading ? (
            <div className="max-w-2xl mx-auto">
              <div className="h-64 rounded-xl bg-muted/30 animate-pulse" />
            </div>
          ) : hasUsedFreeTier ? (
            <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Crown className="h-8 w-8 text-amber-400" />
              </div>
              <p className="text-base font-semibold">Free-Limit erreicht</p>
              <p className="text-[13px] text-muted-foreground max-w-sm">
                Mit dem kostenlosen Plan können Sie <strong>1 Abrechnung pro Jahr</strong> prüfen.
                Upgraden Sie auf Premium für unbegrenzte Prüfungen, Widerspruchsbriefe und PDF-Export.
              </p>
              <Link
                href="/settings"
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
              >
                <Crown className="h-4 w-4" />
                Jetzt auf Premium upgraden (0,99 €/Monat)
              </Link>
            </div>
          ) : contracts.length === 0 ? (
            <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-12 text-center">
              <Home className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm font-semibold">Kein Mietverhältnis angelegt</p>
              <p className="text-[13px] text-muted-foreground">
                Legen Sie zunächst Ihr Mietverhältnis an, bevor Sie eine Abrechnung prüfen können.
              </p>
              <Link
                href="/contracts"
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <Plus className="h-4 w-4" />
                Mietverhältnis anlegen
              </Link>
            </div>
          ) : (
            <BillWizard contracts={contracts} />
          )}
        </main>
      </div>
    </div>
  );
}
