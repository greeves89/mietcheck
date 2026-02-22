import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthGuard } from "@/components/auth/auth-guard";
import { cn } from "@/lib/utils";
import CookieConsent from "@/components/cookie-consent";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "MietCheck - Nebenkostenabrechnung prüfen",
  description: "Prüfen Sie Ihre Nebenkostenabrechnung automatisch auf Fehler und Unstimmigkeiten.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={cn(GeistSans.variable, GeistMono.variable, "min-h-screen bg-background font-sans antialiased")}>
        <ThemeProvider>
          <AuthGuard>{children}</AuthGuard>
          <CookieConsent />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
