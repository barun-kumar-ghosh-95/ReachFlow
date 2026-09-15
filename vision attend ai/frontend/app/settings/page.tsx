"use client";

import { DashboardShell } from "@/components/DashboardShell";
import {
  Settings as GearIcon, Shield, Building2, ShieldAlert, Eye, EyeOff, Save } from "lucide-react";
import { useTheme } from "@/app/providers";
import { useAuth } from "@/lib/auth-store";
import { useState } from "react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const token = useAuth((s) => s.token);
  const role = useAuth((s) => s.role);
  const user = useAuth((s) => s.user);
  const [faceThresh, setFaceThresh] = useState(0.65);
  const [liveThresh, setLiveThresh] = useState(0.7);
  const [lateMin, setLateMin] = useState(15);
  const [restrictDev, setRestrictDev] = useState(false);
  const [restrictLoc, setRestrictLoc] = useState(false);
  const [requireLive, setRequireLive] = useState(true);
  const [retention, setRetention] = useState(2555);
  const [storedImages, setStoredImages] = useState(false);
  const [pw, setPw] = useState({ old: "", n1: "", n2: "" });
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  function saveMsg() {
    setMsg({ type: "ok", text: "Settings saved (demo-mode response)." });
    setTimeout(() => setMsg(null), 2500);
  }

  async function changePw() {
    if (pw.n1.length < 8 || pw.n1 !== pw.n2) {
      setMsg({ type: "err", text: "Passwords must match and be ≥ 8 characters." });
      return;
    }
    setMsg({ type: "ok", text: "Password updated." });
    setPw({ old: "", n1: "", n2: "" });
    setTimeout(() => setMsg(null), 2500);
  }

  const isAdmin = role === "admin";

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Recognition thresholds, liveness, retention, appearance, privacy, security.
        </p>
      </div>

      {msg && (
        <div
          className={`mb-5 p-4 rounded-xl text-sm ${msg.type === "ok"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2 space-y-8">
          <Section title="Recognition &amp; Liveness" icon={Shield}>
            <div className="grid md:grid-cols-2 gap-5">
              <Slider
                label="Face recognition threshold"
                value={faceThresh}
                min={0.4}
                max={0.95}
                step={0.01}
                fmt={(v) => `${(v * 100).toFixed(0)}%`}
                desc="Cosine similarity required to accept a match."
                onChange={setFaceThresh}
                disabled={!isAdmin}
              />
              <Slider
                label="Liveness threshold"
                value={liveThresh}
                min={0.4}
                max={0.95}
                step={0.01}
                fmt={(v) => `${(v * 100).toFixed(0)}%`}
                desc="Anti-spoof / liveness passing score."
                onChange={setLiveThresh}
                disabled={!isAdmin}
              />
              <Slider
                label="Late threshold (minutes)"
                value={lateMin}
                min={1}
                max={120}
                step={1}
                fmt={(v) => `${v} min`}
                desc="Mark LATE when check-in exceeds work-start + N minutes."
                onChange={setLateMin}
                disabled={!isAdmin}
              />
              <div className="space-y-3">
                <Toggle
                  label="Require liveness for check-in"
                  desc="When disabled, skips anti-spoof check (not recommended)."
                  value={requireLive}
                  onChange={setRequireLive}
                  disabled={!isAdmin}
                />
                <Toggle
                  label="Restrict to registered devices"
                  desc="Only allow attendance from enrolled device IDs."
                  value={restrictDev}
                  onChange={setRestrictDev}
                  disabled={!isAdmin}
                />
                <Toggle
                  label="Restrict to geofenced locations"
                  desc="Require device GPS / location tags."
                  value={restrictLoc}
                  onChange={setRestrictLoc}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </Section>

          <Section title="Organization" icon={Building2}>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="label">Organization name</label>
                <input className="input" defaultValue="VisionAttend HQ" disabled={!isAdmin} />
              </div>
              <div>
                <label className="label">Timezone</label>
                <input className="input" defaultValue="Asia/Kolkata" disabled={!isAdmin} />
              </div>
              <div>
                <label className="label">Work start</label>
                <input className="input" defaultValue="09:30" disabled={!isAdmin} />
              </div>
              <div>
                <label className="label">Work end</label>
                <input className="input" defaultValue="18:00" disabled={!isAdmin} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Address</label>
                <input className="input" defaultValue="100 AI Park, Bengaluru, India" disabled={!isAdmin} />
              </div>
            </div>
          </Section>

          <Section title="Privacy &amp; Retention" icon={Eye}>
            <div className="space-y-4">
              <Toggle
                label={
                  storedImages ? "Store raw face enrollment images" : "Store only encrypted facial embeddings (recommended)"
                }
                desc="By default raw images are discarded after embedding."
                value={storedImages}
                onChange={setStoredImages}
                disabled={!isAdmin}
              />
              <Slider
                label="Data retention (days)"
                value={retention}
                min={30}
                max={3650}
                step={30}
                fmt={(v) => `${v} days (${(v / 365).toFixed(1)} y)`}
                desc="Auto-purge audit & attendance after N days."
                onChange={setRetention}
                disabled={!isAdmin}
              />
              <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-5">
                <li>Face embeddings are encrypted at rest with per-tenant keys.</li>
                <li>Right to erasure supported via DELETE /employees/:id.</li>
                <li>All access protected by JWT + RBAC and recorded in audit log.</li>
              </ul>
            </div>
          </Section>

          <Section title="Security" icon={ShieldAlert}>
            <div className="space-y-4">
              <Toggle label="Dark / Light Theme" desc="" value={theme === "dark"} onChange={toggleTheme} />
              <div>
                <div className="font-semibold mb-2">Change password</div>
                <div className="grid md:grid-cols-3 gap-3">
                  <input type="password" className="input" placeholder="Current password"
                    value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} />
                  <input type="password" className="input" placeholder="New password"
                    value={pw.n1} onChange={(e) => setPw({ ...pw, n1: e.target.value })} />
                  <input type="password" className="input" placeholder="Confirm"
                    value={pw.n2} onChange={(e) => setPw({ ...pw, n2: e.target.value })} />
                </div>
                <button className="btn-secondary mt-3 text-xs" onClick={changePw}>
                  Update password
                </button>
              </div>
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Signed-in user
            </div>
            <div className="text-lg font-semibold">{user?.full_name}</div>
            <div className="text-xs text-slate-500">{user?.email} · {role}</div>
            <hr className="my-4 border-slate-100 dark:border-slateish-800" />
            <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-300">
              <li>🔐 JWT session auth</li>
              <li>🛡️ Role: {role}</li>
              <li>📡 Rate limits · input validation</li>
              <li>🧾 All writes → audit log</li>
            </ul>
          </div>
          <div className="card p-5">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Alert delivery (roadmap)
            </div>
            <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <span className="badge-slate">Web Push</span> ready
              </li>
              <li>📧 Email (SMTP / SES)</li>
              <li>💬 Slack / Teams webhooks</li>
              <li>💬 WhatsApp (Gupshup / Twilio)</li>
              <li>🔔 Alert cooldowns & thresholds</li>
            </ul>
          </div>
          {isAdmin && (
            <button className="btn-primary w-full" onClick={saveMsg}>
              <Save className="w-4 h-4" /> Save changes
            </button>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 grid place-items-center">
          <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Slider({ label, value, min, max, step, onChange, fmt, desc, disabled }: any) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs font-mono text-brand-700 dark:text-brand-300 font-semibold">{fmt?.(value) ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-brand-600 my-2"
      />
      <div className="text-xs text-slate-500">{desc}</div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange, disabled }: any) {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center transition" onClick={(e) => disabled && e.preventDefault()}>
        <input
          type="checkbox"
          className="peer sr-only"
          checked={!!value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-slate-200 dark:bg-slateish-800 transition peer-checked:bg-brand-600" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 peer-checked:translate-x-5 shadow-sm" />
      </span>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-slate-500">{desc}</div>}
      </div>
    </label>
  );
}
