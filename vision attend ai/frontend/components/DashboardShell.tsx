"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Video,
  Users,
  ClipboardList,
  LineChart,
  ShieldAlert,
  Camera,
  FileBarChart,
  ScrollText,
  Settings,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth, RoleName } from "@/lib/auth-store";
import { useTheme } from "./providers";
import { cn, initials } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: RoleName[];
}

const NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "hr", "security", "employee"] },
  { label: "Live Attendance", href: "/live", icon: Video, roles: ["admin", "hr", "security", "employee"] },
  { label: "Employees", href: "/employees", icon: Users, roles: ["admin", "hr", "security", "employee"] },
  { label: "Attendance", href: "/attendance", icon: ClipboardList, roles: ["admin", "hr", "security", "employee"] },
  { label: "Analytics", href: "/analytics", icon: LineChart, roles: ["admin", "hr", "security"] },
  { label: "Security Events", href: "/security", icon: ShieldAlert, roles: ["admin", "hr", "security"] },
  { label: "Cameras", href: "/cameras", icon: Camera, roles: ["admin", "security"] },
  { label: "Reports", href: "/reports", icon: FileBarChart, roles: ["admin", "hr", "security"] },
  { label: "Audit Logs", href: "/audit", icon: ScrollText, roles: ["admin"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin", "hr"] },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const role = useAuth((s) => s.role);
  const logout = useAuth((s) => s.logout);
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const nav = NAV.filter((n) => role && n.roles.includes(role));

  return (
    <div className="min-h-screen flex">
      <aside
        className={cn(
          "sticky top-0 h-screen shrink-0 border-r border-slate-200 dark:border-slateish-800 bg-white dark:bg-slateish-900 transition-[width] duration-200 flex flex-col",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="h-16 flex items-center gap-2 px-4 border-b border-slate-200 dark:border-slateish-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white shadow-md shadow-brand-700/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sm tracking-tight leading-tight">VisionAttend AI</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Identity &amp; Attendance
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-0.5">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition",
                  active
                    ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-medium"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slateish-800"
                )}
              >
                <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 dark:border-slateish-800 p-3">
          <div
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg",
              collapsed ? "justify-center" : ""
            )}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-brand-700 grid place-items-center text-white font-semibold text-sm shrink-0">
              {initials(user?.full_name)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.full_name ?? "User"}</div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {role}
                </div>
              </div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              className="btn-ghost py-1.5 text-xs"
              onClick={() => {
                const next = theme === "light" ? "dark" : "light";
                setTheme(next);
                localStorage.setItem("theme", next);
                document.documentElement.classList.toggle("dark", next === "dark");
              }}
              title="Toggle theme"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button
              className="btn-ghost py-1.5 text-xs"
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <button
            className="mt-2 w-full btn-ghost py-1.5 text-xs"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-slate-200 dark:border-slateish-800 bg-white/70 dark:bg-slateish-900/60 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 font-semibold">
              {nav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label ||
                "VisionAttend AI"}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusDotPill />
          </div>
        </header>
        <main className="flex-1 px-6 py-6 max-w-[1500px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function StatusDotPill() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      Platform Online
    </div>
  );
}
