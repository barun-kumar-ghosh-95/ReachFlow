"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { FileBarChart, FileDown, Calendar, ClipboardList, ShieldAlert, Users2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-store";
import { useState } from "react";
import { API_BASE } from "@/lib/utils";

const CATEGORY = [
  {
    title: "Attendance reports",
    icon: ClipboardList,
    tone: "brand",
    items: [
      { name: "Daily attendance", desc: "Every check-in/check-out status + camera, IP, liveness",
        link: "/analytics/reports/daily-attendance",
        dateArg: (d: string) => `target_date=${d || todayISO()}`,
        needsDate: true },
      { name: "Monthly attendance", desc: "Roll-up across a month for all employees",
        link: "/analytics/reports/monthly-attendance",
        ymArg: true },
      { name: "Employee attendance (30 days)", desc: "Per-employee summaries, rates, lates",
        link: null },
    ],
  },
  {
    title: "Security reports",
    icon: ShieldAlert,
    tone: "rose",
    items: [
      { name: "Security events export", desc: "Spoofs, unknowns, failed recognitions",
        link: "/analytics/reports/security-events",
        rangeArg: true },
      { name: "Failed verifications report", desc: "Low-confidence / liveness failures",
        link: null },
      { name: "Spoof attempt log", desc: "Critical anti-spoof detections by camera / zone",
        link: null },
    ],
  },
  {
    title: "HR / Admin",
    icon: Users2,
    tone: "emerald",
    items: [
      { name: "Late arrivals summary", desc: "Late-by-day & per-employee late stats", link: null },
      { name: "Department attendance", desc: "Dept rate trends & ranks", link: null },
      { name: "Anomalies export", desc: "AI anomalies for HR review", link: null },
    ],
  },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const token = useAuth((s) => s.token);
  const role = useAuth((s) => s.role);
  const [date1, setDate1] = useState<string>(todayISO());
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [rFrom, setRFrom] = useState<string>("");
  const [rTo, setRTo] = useState<string>("");

  async function download(relPath: string, params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}${relPath}${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Report failed");
    const blob = await res.blob();
    const disp = res.headers.get("Content-Disposition") || "";
    const match = /filename="?([^";]+)"?/.exec(disp);
    const fname = match ? match[1] : "report.csv";
    const a = document.createElement("a");
    const u = URL.createObjectURL(blob);
    a.href = u;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Exportable attendance, security, and HR reports (CSV · Excel · PDF-ready structure).
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {CATEGORY.map((cat) => (
          <div key={cat.title} className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={
                  "w-10 h-10 rounded-xl grid place-items-center " +
                  (cat.tone === "brand"
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : cat.tone === "rose"
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300")
                }
              >
                <cat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">{cat.title}</div>
                <div className="text-xs text-slate-500">{cat.items.length} reports</div>
              </div>
            </div>
            <div className="space-y-3">
              {cat.items.map((it) => (
                <div
                  key={it.name}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slateish-800 hover:border-brand-500/50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{it.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{it.desc}</div>
                    </div>
                    {it.link ? (
                      <FileDown className="w-4 h-4 text-brand-600 shrink-0" />
                    ) : (
                      <span className="badge-amber">Roadmap</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    {it.needsDate && (
                      <input
                        type="date"
                        className="input !py-1.5 text-xs w-auto"
                        value={date1}
                        onChange={(e) => setDate1(e.target.value)}
                      />
                    )}
                    {it.ymArg && (
                      <>
                        <input
                          type="number"
                          className="input !py-1.5 text-xs w-24"
                          min={2000}
                          max={2100}
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                        />
                        <select
                          className="input !py-1.5 text-xs w-28"
                          value={month}
                          onChange={(e) => setMonth(e.target.value)}
                        >
                          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(
                            (m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            )
                          )}
                        </select>
                      </>
                    )}
                    {it.rangeArg && (
                      <>
                        <input
                          type="date"
                          className="input !py-1.5 text-xs w-auto"
                          value={rFrom}
                          onChange={(e) => setRFrom(e.target.value)}
                          title="From"
                        />
                        <input
                          type="date"
                          className="input !py-1.5 text-xs w-auto"
                          value={rTo}
                          onChange={(e) => setRTo(e.target.value)}
                          title="To"
                        />
                      </>
                    )}
                    <button
                      className="btn-primary !py-1.5 text-xs"
                      disabled={!it.link}
                      onClick={async () => {
                        if (!it.link) return;
                        try {
                          const params: Record<string, string> = {};
                          if (it.needsDate) params["target_date"] = date1;
                          if (it.ymArg) {
                            params["year"] = year;
                            params["month"] = String(parseInt(month));
                          }
                          if (it.rangeArg) {
                            if (rFrom) params["date_from"] = rFrom;
                            if (rTo) params["date_to"] = rTo;
                          }
                          await download(it.link, params);
                        } catch (e: any) {
                          alert("Report download failed — " + (e?.message || "try again");
                        }
                      }}
                    >
                      Download CSV
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 mt-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slateish-800 grid place-items-center">
            <FileBarChart className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">Supported formats</div>
            <div className="text-sm text-slate-500">
              CSV (UTF-8 with BOM for Excel; Excel (openpyxl-based .xlsx); PDF (reportlab).
              All exports include camera / location / IP / confidence + audit fields where relevant.
            </div>
          </div>
          <Link href="/analytics" className="btn-outline text-xs">
            Open analytics →
          </Link>
        </div>
      </div>

      {(role === "admin" || role === "hr") && (
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <ReportCardHint title="Demo exports" points={[
            "Daily: per-employee check-in, check-out, status",
            "Monthly: 30-day rolling with late/early columns",
            "Security: event type + severity + resolver"
          ]} />
          <ReportCardHint title="Roadmap" points={[
            "Excel (.xlsx) multi-sheet workbooks",
            "Paginated PDF with header + logo",
            "Scheduled email / Slack digests",
            "Sharepoint / SFTP drop targets"
          ]} />
          <ReportCardHint title="Retention" points={[
            "Configurable data retention (default 7y",
            "Biometric embeddings only, no raw images by default",
            "Right to erasure supported via /settings privacy panel"]
            } />
        </div>
      )}
    </DashboardShell>
  );
}

function ReportCardHint({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="card p-5">
      <div className="font-semibold mb-2">{title}</div>
      <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
