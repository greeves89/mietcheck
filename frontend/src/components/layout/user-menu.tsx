"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import { LogOut, User, Settings } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    logout();
    router.push("/login");
  };

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent/50 transition-all duration-150 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-[11px] font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[200px] rounded-xl border border-border bg-card/95 backdrop-blur-xl p-1.5 shadow-xl animate-slide-up"
          side="top"
          align="start"
          sideOffset={4}
        >
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-[13px] font-medium">{user.name}</p>
            <p className="text-[11px] text-muted-foreground">{user.subscription_tier === "premium" ? "Premium" : "Free"}</p>
          </div>

          <DropdownMenu.Item
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors outline-none"
            onSelect={() => router.push("/settings")}
          >
            <Settings className="h-4 w-4" />
            Einstellungen
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-colors outline-none"
            onSelect={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
