"use client";

import { DashboardShell } from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import AttendanceChart from "@/components/AttendanceChart";
import DepartmentChart from "@/components/DepartmentChart";
import InsightsPanel from "@/components/InsightsPanel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from "recharts";
import { useEffect, useState } from "react";
import { apiFetch, fmtPct } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import {
  Users2,
  UserCheck2,
  Clock,
  Gauge,
  TrendingUp,
  BrainCircuit,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Target,
  BarChart3,
} from "lucide-react";

const MOCK_PERF = {
  recognition_accuracy: 98.64,
  precision: 97.3,
  recall: 98.1,
  f1_score: 97.7,
  false_acceptance_rate: 0.18,
  false_rejection_rate: 0.72,
  liveness_accuracy: 96.4,
  average_inference_latency_ms: 182.3,
  total_verifications: 12480,
  successful_verifications: 12134,
  failed_verifications: 346,
  period: "last_30_days",
};

export default function AnalyticsPage() {
  const token = useAuth((s) => s.token);
  const [perf, setPerf] = useState<any>(MOCK_PERF);
  const [anoms, setAnoms] = useState<any[]>([]);
  const [secTrend, setSecTrend] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setPerf(await apiFetch("/analytics/model-performance?days=30", { token }));
      } catch {}
      try {
        const a = await apiFetch("/analytics/anomalies?days=30", { token });
        setAnoms(a.results || []);
      } catch {
        setAnoms([
          {
            employee_id: 1, employee_code: "EMP001", employee_name: "Rahul Sharma",
            anomaly_score: 3.21, requires_human_review: true, sample_size: 22,
          },
          {
            employee_id: 2, employee_code: "EMP002", employee_name: "Ananya Verma",
            anomaly_score: 2.44, requires_human_review: true, sample_size: 21,
          },
        ]);
      }
      try {
        const s = await apiFetch("/analytics/security/trends?days=14", { token });
        setSecTrend(s || mockSec());
      } catch {
        setSecTrend(mockSec());
      }
    })();
  }, [token]);

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Trends, model performance, anomalies, workforce patterns, and AI insights.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Gauge} label="Recognition accuracy" value={`${fmtPct(perf.recognition_accuracy)}`} tone="brand" mini />
        <StatCard icon={Target} label="F1 Score" value={`${fmtPct(perf.f1_score)}`} tone="emerald" mini />
        <StatCard icon={ShieldCheck} label="Liveness accuracy" value={`${fmtPct(perf.liveness_accuracy)}`} tone="blue" mini />
        <StatCard icon={Activity} label="Avg latency" value={`${perf.average_inference_latency_ms?.toFixed(0)} ms`} tone="violet" mini />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
        <StatCard icon={Shield} label="FAR" value={`${perf.false_acceptance_rate}%`} tone="rose" mini />
        <StatCard icon={ShieldAlert} label="FRR" value={`${perf.false_rejection_rate}%`} tone="amber" mini />
        <StatCard icon={Users2} label="Total verifications" value={perf.total_verifications} tone="brand" mini />
        <StatCard icon={UserCheck2} label="Successful" value={perf.successful_verifications} tone="emerald" mini />
        <StatCard icon={TrendingUp} label="Precision" value={`${fmtPct(perf.precision)}`} tone="blue" mini />
        <StatCard icon={Clock} label="Recall" value={`${fmtPct(perf.recall)}`} tone="violet" mini />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Attendance · 30 day
              </div>
              <div className="text-lg font-semibold">Daily presence, absentees, late</div>
            </div>
          </div>
          <AttendanceChart days={30} />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Departments
              </div>
              <div className="text-lg font-semibold">Attendance distribution</div>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <DepartmentChart />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Security trends
              </div>
              <div className="text-lg font-semibold">Spoofs · unknowns · failed recognitions</div>
            </div>
            <ShieldAlert className="w-5 h-5 text-rose-500" />
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={secTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="cB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.25)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="unknown_faces" name="Unknown faces" stroke="#f59e0b" fill="url(#cA)" strokeWidth={2} />
                <Area type="monotone" dataKey="spoof_attempts" name="Spoof attempts" stroke="#ef4444" fill="url(#cB)" strokeWidth={2} />
                <Line type="monotone" dataKey="failed_recognitions" name="Failed recognition" stroke="#3a61ff" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                AI Anomaly Detection
              </div>
              <div className="text-lg font-semibold">Unusual attendance behavior</div>
            </div>
            <BrainCircuit className="w-5 h-5 text-brand-500" />
          </div>

          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs mb-4 text-amber-800 dark:text-amber-300">
            ⚠️ AI-generated anomaly — requires human review. Never automatically punish an employee
            based only on anomaly detection.
          </div>

          <div className="space-y-2">
            {anoms.length === 0 && (
              <div className="text-sm text-slate-500 p-6 text-center border border-dashed border-slate-200 dark:border-slateish-800 rounded-lg">
                No anomalies detected in the current window.
              </div>
            )}
            {anoms.map((a) => (
              <div
                key={a.employee_id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slateish-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {a.employee_name}{" "}
                      <span className="font-mono text-xs text-slate-500">· {a.employee_code}</span>
                    </div>
                    <div className="text-xs text-slate-500">Sample size: {a.sample_size} attendance days</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${
                        a.anomaly_score > 3 ? "text-rose-600" : "text-amber-600"
                      }`}
                    >
                      {a.anomaly_score.toFixed(2)} σ
                    </div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                      Anomaly score
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <InsightsPanel />
      </div>
    </DashboardShell>
  );
}

function mockSec() {
  const arr: any[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const iso = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    arr.push({
      date: iso,
      spoof_attempts: Math.max(0, Math.round(Math.random() * 4)),
      unknown_faces: Math.max(0, Math.round(Math.random() * 8)),
      failed_recognitions: Math.max(0, Math.round(3 + Math.random() * 9)),
    });
  }
  return arr;
}
