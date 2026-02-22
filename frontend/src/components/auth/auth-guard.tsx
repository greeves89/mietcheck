"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";

const PUBLIC_ROUTES = ["/login", "/register", "/impressum", "/datenschutz", "/agb", "/forgot-password", "/reset-password", "/verify-email"];
const LANDING_ROUTE = "/";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      try {
        const me = await api.getMe();
        setUser(me);
      } catch {
        setUser(null);
      }
    };
    init();
  }, [setUser]);

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isLanding = pathname === LANDING_ROUTE;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 animate-pulse" />
          <p className="text-sm text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  // Landing page: logged-in users go to dashboard, others see landing
  if (isLanding) {
    if (user && typeof window !== "undefined") {
      router.replace("/dashboard");
      return null;
    }
    return <>{children}</>;
  }

  if (!user && !isPublic) {
    if (typeof window !== "undefined") {
      router.replace("/login");
    }
    return null;
  }

  if (user && isPublic) {
    if (typeof window !== "undefined") {
      router.replace("/dashboard");
    }
    return null;
  }

  return <>{children}</>;
}
