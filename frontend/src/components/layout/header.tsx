"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useMobileNav } from "./mobile-nav-context";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contracts": "Mietverhältnisse",
  "/bills": "Abrechnungen",
  "/bills/new": "Neue Prüfung",
  "/mietpreisbremse": "Mietpreisbremse",
  "/betriebskosten-assistent": "BK-Assistent",
  "/betriebskostenspiegel": "BK-Spiegel",
  "/mietrecht": "Mietrecht-Checks",
  "/mietvertrag": "Vertragsprüfung",
  "/feedback": "Feedback",
  "/settings": "Einstellungen",
  "/admin": "Admin-Dashboard",
  "/admin/users": "Nutzerverwaltung",
  "/admin/feedback": "Feedback-Verwaltung",
};

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title: titleProp, subtitle }: HeaderProps = {}) {
  const pathname = usePathname();
  const { toggle } = useMobileNav();

  let title = titleProp || "MietCheck";
  if (!titleProp) {
    for (const [path, label] of Object.entries(PAGE_TITLES)) {
      if (pathname === path || (path !== "/" && pathname.startsWith(path))) {
        title = label;
      }
    }
  }

  return (
    <header className="h-14 border-b border-border bg-card/30 backdrop-blur-sm flex items-center px-6 gap-3">
      <button
        onClick={toggle}
        className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        aria-label="Menü öffnen"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div>
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground hidden sm:block">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
