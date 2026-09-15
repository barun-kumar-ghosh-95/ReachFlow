"use client";

import { DashboardShell } from "@/components/DashboardShell";
import {
  Users2,
  UserCheck2,
  UserX2,
  Clock,
  Activity,
  ShieldAlert,
  UserQuestion,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import AttendanceChart from "@/components/AttendanceChart";
import DepartmentChart from "@/components/DepartmentChart";
import InsightsPanel from "@/components/InsightsPanel";
import { useEffect, useState } from "react";
import { apiFetch, fmtTime, STATUS_META, SEVERITY_META } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import Link from "next/link";

export default function DashboardPage() {
  const token = useAuth((s) => s.token);
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const s = await apiFetch("/analytics/dashboard", { token });
        setStats(s);
      } catch (e) {}
      try {
        const r = await apiFetch("/attendance/today/recent?limit=6", { token });
        setRecent(r);
      } catch (e) {}
      try {
        const s = await apiFetch(
          "/analytics/security/events?page=1&page_size=5",
          { token }
        );
        setEvents(s.events || []);
      } catch (e) {}
    })();
  }, [token]);

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time workforce presence, security signals, and platform health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/reports" className="btn-outline">
            Export Report
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/live" className="btn-primary">
            Open Live Attendance
            <Activity className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users2}
          label="Total Employees"
          value={stats?.total_employees ?? 0}
          hint="Active workforce"
          tone="brand"
        />
        <StatCard
          icon={UserCheck2}
          label="Present Today"
          value={stats?.present_today ?? 0}
          hint={
            stats?.attendance_rate != null
              ? `${stats.attendance_rate.toFixed(1)}% attendance rate`
              : "Live updates"
          }
          tone="emerald"
        />
        <StatCard
          icon={UserX2}
          label="Absent Today"
          value={stats?.absent_today ?? 0}
          hint="Unmarked + leaves"
          tone="rose"
        />
        <StatCard
          icon={Clock}
          label="Late Arrivals"
          value={stats?.late_today ?? 0}
          hint={stats?.average_check_in_time ? `Avg. check-in ${stats.average_check_in_time}` : "Threshold 15 min"}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <StatCard
          icon={Activity}
          label="Check-ins Last Hour"
          value={stats?.check_ins_last_hour ?? 0}
          tone="blue"
          mini
        />
        <StatCard
          icon={AlertTriangle}
          label="Failed Verifications"
          value={stats?.failed_verifications_today ?? 0}
          tone="amber"
          mini
        />
        <StatCard
          icon={ShieldAlert}
          label="Spoof Attempts"
          value={stats?.spoof_attempts_today ?? 0}
          tone="rose"
          mini
        />
        <StatCard
          icon={UserQuestion}
          label="Unknown Faces"
          value={stats?.unknown_faces_today ?? 0}
          tone="violet"
          mini
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Attendance trend
              </div>
              <div className="text-lg font-semibold">Daily attendance — last 14 days</div>
            </div>
            <Link href="/analytics" className="btn-ghost text-xs">
              View analytics
              <TrendingUp className="w-4 h-4" />
            </Link>
          </div>
          <AttendanceChart compact />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Security alerts
              </div>
              <div className="text-lg font-semibold">Recent events</div>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="space-y-3">
            {events.length === 0 && (
              <div className="text-sm text-slate-500 p-4 border border-dashed border-slate-200 dark:border-slateish-800 rounded-lg text-center">
                No recent security events
              </div>
            )}
            {events.slice(0, 5).map((ev: any) => {
              const s = SEVERITY_META[ev.severity] || SEVERITY_META.medium;
              return (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200/70 dark:border-slateish-800 hover:bg-slate-50 dark:hover:bg-slateish-900"
                >
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{ev.event_type}</span>
                      <span className={s.cls}>{s.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {ev.description ||
                        `${ev.camera_name || ev.location_name || "Camera"} · ${fmtTime(ev.created_at)}`}
                    </div>
                  </div>
                </div>
              );
            })}
            <Link href="/security" className="btn-outline w-full text-xs mt-1">
              Open security dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Departments
              </div>
              <div className="text-lg font-semibold">Attendance by team</div>
            </div>
          </div>
          <DepartmentChart />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Recent check-ins
              </div>
              <div className="text-lg font-semibold">Today so far</div>
            </div>
          </div>
          <div className="space-y-3">
            {recent.length === 0 && (
              <div className="text-sm text-slate-500 p-4 border border-dashed border-slate-200 dark:border-slateish-800 rounded-lg text-center">
                No check-ins yet today
              </div>
            )}
            {recent.map((r: any) => {
              const s = STATUS_META[r.status.toLowerCase?.()] || STATUS_META[r.status] || STATUS_META.present;
              return (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slateish-900">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-xs font-semibold shrink-0">
                    {(r.employee_name || "??").split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {r.employee_name}{" "}
                      <span className="text-slate-400 text-xs font-normal">
                        · {r.employee_employee_id}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {fmtTime(r.check_in_time)}
                      {r.location_name ? ` · ${r.location_name}` : ""}
                    </div>
                  </div>
                  <span className={s.cls}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <InsightsPanel />
      </div>
    </DashboardShell>
  );
}
