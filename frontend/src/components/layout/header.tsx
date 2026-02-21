"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contracts": "Mietverhältnisse",
  "/bills": "Abrechnungen",
  "/bills/new": "Neue Prüfung",
  "/feedback": "Feedback",
  "/settings": "Einstellungen",
  "/admin": "Admin-Dashboard",
  "/admin/users": "Nutzerverwaltung",
  "/admin/feedback": "Feedback-Verwaltung",
};

export function Header() {
  const pathname = usePathname();

  let title = "MietCheck";
  for (const [path, label] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || (path !== "/" && pathname.startsWith(path))) {
      title = label;
    }
  }

  return (
    <header className="h-14 border-b border-border bg-card/30 backdrop-blur-sm flex items-center px-6">
      <h1 className="text-sm font-semibold text-foreground">{title}</h1>
    </header>
  );
}
