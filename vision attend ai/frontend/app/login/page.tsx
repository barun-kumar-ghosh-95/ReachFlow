"use client";

import { useState } from "react";
import { Sparkles, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const login = useAuth((s) => s.login);
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  const accounts = [
    { label: "Admin", u: "admin", p: "Admin@123", color: "from-brand-500 to-brand-700" },
    { label: "HR Manager", u: "hr_manager", p: "HR@12345", color: "from-amber-500 to-amber-700" },
    { label: "Security Officer", u: "security", p: "Security@123", color: "from-rose-500 to-rose-700" },
    { label: "Employee", u: "employee1", p: "Employee@123", color: "from-emerald-500 to-emerald-700" },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-800 text-white p-12">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
          backgroundSize: "30px 30px, 40px 40px",
        }} />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur grid place-items-center border border-white/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">VisionAttend AI</div>
            <div className="text-sm text-white/70">Enterprise Workforce Identity Platform</div>
          </div>
        </div>

        <div className="relative flex-1 flex flex-col justify-center max-w-md">
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/60 font-semibold mb-4">
            Computer Vision · Liveness Detection · RBAC · Analytics
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Intelligent Workforce Identity, Attendance &amp; Security.
          </h1>
          <p className="mt-6 text-white/80 leading-relaxed">
            Face recognition with liveness &amp; anti-spoofing, real-time attendance,
            suspicious-activity detection, and a full HR/Admin/Employee role system — all
            in one production-grade platform.
          </p>

          <ul className="mt-10 space-y-3 text-sm text-white/85">
            {[
              "Face Detection → Quality → Alignment → Embedding → Identity Match → Liveness → Decision Engine",
              "Anti-spoofing: photo, screen, replay; challenge-response for high-security zones",
              "RBAC (Admin / HR / Security / Employee) with audit logs, reports, and anomalies",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/60 mt-8">
          © {new Date().getFullYear()} VisionAttend AI · Demo Mode — EMP001…EMP005 preloaded
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-slate-50 dark:bg-slateish-950">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand-600 grid place-items-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold">VisionAttend AI</div>
              <div className="text-xs text-slate-500">Sign in to continue</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-slate-500 mt-1 text-sm">Sign in to access your organization dashboard.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Username or email</label>
              <input
                className="input"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              className="btn-primary w-full py-2.5"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-8">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
              Demo quick access
            </div>
            <div className="grid grid-cols-2 gap-2">
              {accounts.map((a) => (
                <button
                  key={a.u}
                  type="button"
                  onClick={() => {
                    setUsername(a.u);
                    setPassword(a.p);
                  }}
                  className="group text-left p-3 rounded-lg border border-slate-200 dark:border-slateish-800 hover:border-brand-500/60 transition"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.color} text-white grid place-items-center text-xs font-bold mb-2`}>
                    {a.label[0]}
                  </div>
                  <div className="text-sm font-semibold">{a.label}</div>
                  <div className="text-[11px] text-slate-500">
                    {a.u} · {a.p.slice(0, 4)}••••
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
