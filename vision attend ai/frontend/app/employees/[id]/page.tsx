"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  Mail,
  Phone,
  Calendar,
  Building2,
  IdCard,
  Briefcase,
  ArrowLeft,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { apiFetch, fmtDate, initials, STATUS_META, fmtPct } from "@/lib/utils";
import AttendanceChart from "@/components/AttendanceChart";

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const token = useAuth((s) => s.token);
  const [emp, setEmp] = useState<any | null>(null);
  const [faces, setFaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const e = await apiFetch(`/employees/${id}`, { token });
        setEmp(e);
      } catch {
        setEmp(demo);
      }
      try {
        const f = await apiFetch(`/employees/${id}/faces`, { token });
        setFaces(f);
      } catch {
        setFaces([
          { id: 1, quality_score: 0.95, is_primary: true, created_at: new Date().toISOString() },
          { id: 2, quality_score: 0.88, is_primary: false, created_at: new Date().toISOString() },
          { id: 3, quality_score: 0.82, is_primary: false, created_at: new Date().toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  return (
    <DashboardShell>
      <div className="mb-5">
        <Link href="/employees" className="btn-ghost text-sm !px-0">
          <ArrowLeft className="w-4 h-4" /> Back to employees
        </Link>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-slate-500">Loading profile…</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center font-bold text-2xl shadow-lg shadow-brand-700/30">
                {initials(`${emp?.first_name} ${emp?.last_name}`)}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold tracking-tight truncate">
                  {emp?.first_name} {emp?.last_name}
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <IdCard className="w-3.5 h-3.5" /> {emp?.employee_id}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {emp?.is_active ? (
                    <span className="badge-green">Active</span>
                  ) : (
                    <span className="badge-red">Inactive</span>
                  )}
                  <span className="badge-blue">
                    <Briefcase className="w-3 h-3" /> {emp?.designation || "Staff"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <InfoRow icon={Mail} label="Email" value={emp?.email} />
              <InfoRow icon={Phone} label="Phone" value={emp?.phone || "—"} />
              <InfoRow
                icon={Building2}
                label="Department"
                value={emp?.department?.name || "—"}
              />
              <InfoRow
                icon={Calendar}
                label="Joining date"
                value={fmtDate(emp?.joining_date)}
              />
              <InfoRow
                icon={ShieldCheck}
                label="Working hours"
                value={`${emp?.working_hours_start || "09:30"} – ${emp?.working_hours_end || "18:00"}`}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <KPI
                label="Attendance rate"
                value={fmtPct(emp?.attendance_rate ?? 0)}
                tone="emerald"
              />
              <KPI label="Present" value={emp?.total_present ?? 0} tone="brand" />
              <KPI label="Absent" value={emp?.total_absent ?? 0} tone="rose" />
              <KPI label="Late arrivals" value={emp?.late_arrivals ?? 0} tone="amber" />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Attendance · last 14 days
                  </div>
                  <div className="text-lg font-semibold">Presence &amp; punctuality</div>
                </div>
              </div>
              <AttendanceChart compact />
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Face enrollments
                  </div>
                  <div className="text-lg font-semibold">Biometric gallery</div>
                </div>
                <span className="badge-blue">
                  <Shield className="w-3 h-3" /> {faces.length} embeddings · encrypted
                </span>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {faces.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slateish-800 relative"
                  >
                    {f.is_primary && (
                      <span className="absolute top-3 right-3 badge-green">PRIMARY</span>
                    )}
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slateish-800 dark:to-slateish-900 grid place-items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 border border-white/50" />
                    </div>
                    <div className="text-sm font-semibold">Embedding #{f.id}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Quality {fmtPct((f.quality_score || 0) * 100, 1)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Enrolled {fmtDate(f.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Verification history
                  </div>
                  <div className="text-lg font-semibold">Last verifications</div>
                </div>
              </div>
              <div className="space-y-2">
                {history.map((h, i) => {
                  const s = STATUS_META[h.status] || STATUS_META.present;
                  const Icon =
                    h.status === "rejected" || h.status === "suspicious"
                      ? AlertTriangle
                      : CheckCircle2;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/70 dark:border-slateish-800"
                    >
                      <div
                        className={`w-9 h-9 rounded-lg grid place-items-center ${
                          h.status === "rejected" || h.status === "suspicious"
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {h.status_label}
                          <span className="ml-2 text-xs text-slate-500 font-normal">
                            {fmtDate(h.timestamp)} · {h.camera}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Recognition {fmtPct(h.confidence * 100, 1)} · Liveness{" "}
                          {fmtPct(h.liveness * 100, 1)}
                        </div>
                      </div>
                      <span className={s.cls}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slateish-800 grid place-items-center text-slate-500">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
          {label}
        </div>
        <div className="text-sm truncate">{value}</div>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  tone,
}: {
  label: string;
  value: any;
  tone: "emerald" | "brand" | "rose" | "amber";
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  };
  return (
    <div className={`p-4 rounded-xl ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

const demo: any = {
  id: 1,
  employee_id: "EMP001",
  first_name: "Rahul",
  last_name: "Sharma",
  email: "rahul.sharma@visionattend.ai",
  phone: "+91-9800000010",
  designation: "Senior Software Engineer",
  department: { name: "Engineering" },
  joining_date: "2024-02-01",
  working_hours_start: "09:30",
  working_hours_end: "18:00",
  is_active: true,
  attendance_rate: 94.8,
  total_present: 24,
  total_absent: 1,
  late_arrivals: 2,
};

const history = [
  {
    status: "checked_in",
    status_label: "Check-in successful",
    timestamp: new Date().toISOString(),
    camera: "CAM-01 · Main Entrance",
    confidence: 0.97,
    liveness: 0.91,
  },
  {
    status: "late",
    status_label: "Late by 14 min",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    camera: "CAM-01 · Main Entrance",
    confidence: 0.94,
    liveness: 0.88,
  },
  {
    status: "checked_in",
    status_label: "Check-in successful",
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    camera: "CAM-01 · Main Entrance",
    confidence: 0.96,
    liveness: 0.92,
  },
  {
    status: "rejected",
    status_label: "Liveness failed (replay attempt blocked)",
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
    camera: "CAM-04 · Factory Zone B",
    confidence: 0.71,
    liveness: 0.32,
  },
];
