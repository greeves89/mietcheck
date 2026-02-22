"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PlusCircle, FileSearch, Filter } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { Header } from "@/components/layout/header";
import { BillCard } from "@/components/bills/bill-card";
import { YearComparison } from "@/components/bills/year-comparison";
import { useBills } from "@/hooks/use-bills";

export default function BillsPage() {
  const { bills, isLoading } = useBills();

  return (
    <MobileNavProvider>
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Abrechnungen</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {bills.length} Abrechnung{bills.length !== 1 ? "en" : ""} geprüft
              </p>
            </div>
            <Link
              href="/bills/new"
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              Neue Prüfung
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-16 text-center">
              <FileSearch className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm font-medium">Noch keine Abrechnungen geprüft</p>
              <p className="text-[13px] text-muted-foreground max-w-sm">
                Starten Sie Ihre erste Prüfung und erfahren Sie, ob Ihre Nebenkostenabrechnung korrekt ist.
              </p>
              <Link
                href="/bills/new"
                className="mt-2 flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                Jetzt prüfen
              </Link>
            </div>
          ) : (
            <>
              <YearComparison bills={bills} />
              <div className="space-y-3">
                {bills.map((bill, i) => (
                  <BillCard key={bill.id} bill={bill} index={i} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
    </MobileNavProvider>
  );
}
