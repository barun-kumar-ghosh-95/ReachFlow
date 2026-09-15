"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  Video,
  VideoOff,
  Camera,
  ShieldCheck,
  ShieldX,
  CheckCircle2,
  XCircle,
  Clock,
  IdCard,
  Users,
  UserCheck2,
  AlertTriangle,
  RefreshCw,
  Fingerprint,
  ScanFace,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { apiFetch, fmtDateTime, fmtPct, STATUS_META, SEVERITY_META, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

type VerifyState = {
  recognized: boolean;
  employee_id?: number;
  employee_employee_id?: string;
  employee_name?: string;
  department?: string;
  recognition_confidence?: number;
  liveness_score?: number;
  liveness_passed?: boolean | null;
  face_quality_score?: number;
  attendance_status?: string;
  attendance_message?: string;
  check_in_time?: string;
  is_duplicate?: boolean;
  face_box?: number[];
};

const EMPTY: VerifyState = { recognized: false };

export default function LiveAttendancePage() {
  const token = useAuth((s) => s.token);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [autoVerify, setAutoVerify] = useState(true);
  const [simulateMode, setSimulateMode] = useState(false);
  const [state, setState] = useState<VerifyState>(EMPTY);
  const [recent, setRecent] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [frameTick, setFrameTick] = useState(0);
  const [processing, setProcessing] = useState(false);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (e: any) {
      setCameraError(
        e?.message ||
          "Could not access webcam. Allow camera permission or enable Demo Simulation below."
      );
      setCameraReady(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/attendance/today/recent?limit=8", { token });
        setRecent(r);
      } catch {}
      try {
        const s = await apiFetch("/analytics/security/events?page=1&page_size=5", { token });
        setEvents(s.events || []);
      } catch {}
    })();
  }, [token]);

  useEffect(() => {
    if (!cameraReady && !simulateMode) return;
    tickRef.current = window.setInterval(() => setFrameTick((t) => t + 1), simulateMode ? 2500 : 3000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [cameraReady, simulateMode]);

  useEffect(() => {
    if (frameTick === 0) return;
    if (!autoVerify) return;
    if (simulateMode) runSimulated();
    else runVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameTick]);

  async function captureFrameAsBase64(): Promise<string | null> {
    if (!videoRef.current || !canvasRef.current) return null;
    const v = videoRef.current;
    const c = canvasRef.current;
    const w = v.videoWidth || 640;
    const h = v.videoHeight || 480;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.85);
  }

  async function runVerify() {
    if (processing) return;
    const b64 = await captureFrameAsBase64();
    if (!b64) return;
    setProcessing(true);
    try {
      const body = new FormData();
      body.append("face_base64", b64);
      body.append("auto_check_in", "true");
      body.append("require_liveness", "true");
      const res = await apiFetch("/attendance/verify", { method: "POST", body, token });
      setState(res);
      if (res.recognized && res.attendance_status !== "REJECTED" && res.attendance_status !== "DUPLICATE") {
        // refresh recent in background
        apiFetch("/attendance/today/recent?limit=8", { token })
          .then((r) => setRecent(r))
          .catch(() => {});
      }
    } catch (err: any) {
      setState({
        recognized: false,
        attendance_message: err?.message || "Verification error",
      });
    } finally {
      setProcessing(false);
    }
  }

  function runSimulated() {
    const employees = [
      { name: "Rahul Sharma", id: "EMP001", dept: "Engineering" },
      { name: "Ananya Verma", id: "EMP002", dept: "Product" },
      { name: "Karan Kapoor", id: "EMP003", dept: "Human Resources" },
      { name: "Sneha Iyer", id: "EMP004", dept: "Security" },
      { name: "Arjun Patel", id: "EMP005", dept: "Operations" },
    ];
    const scenario = Math.random();
    if (scenario < 0.05) {
      setState({
        recognized: false,
        liveness_passed: false,
        liveness_score: 0.28,
        recognition_confidence: 0.3,
        face_quality_score: 0.72,
        attendance_status: "REJECTED",
        attendance_message: "Liveness check failed — possible spoof",
        face_box: [160, 90, 480, 470],
      });
      return;
    }
    if (scenario < 0.12) {
      setState({
        recognized: false,
        recognition_confidence: 0.41,
        face_quality_score: 0.62,
        attendance_status: "REJECTED",
        attendance_message: "Identity could not be confidently verified",
        face_box: [180, 100, 460, 460],
      });
      return;
    }
    const e = employees[Math.floor(Math.random() * employees.length)];
    const late = Math.random() < 0.25;
    const dup = state.employee_employee_id === e.id && state.attendance_status && state.attendance_status !== "REJECTED";
    const conf = 0.9 + Math.random() * 0.09;
    const live = 0.8 + Math.random() * 0.19;
    const quality = 0.75 + Math.random() * 0.24;
    setState({
      recognized: true,
      employee_id: 100 + employees.indexOf(e),
      employee_employee_id: e.id,
      employee_name: e.name,
      department: e.dept,
      recognition_confidence: conf,
      liveness_passed: true,
      liveness_score: live,
      face_quality_score: quality,
      attendance_status: dup ? "DUPLICATE" : late ? "late" : "CHECKED_IN",
      attendance_message: dup
        ? "Attendance already recorded."
        : late
        ? `Late by ${10 + Math.floor(Math.random() * 30)} minutes`
        : "CHECK-IN SUCCESSFUL",
      is_duplicate: !!dup,
      check_in_time: new Date().toISOString(),
      face_box: [150 + Math.floor(Math.random() * 40), 70 + Math.floor(Math.random() * 40), 490, 480],
    });
    if (!dup) {
      setRecent((prev) => [
        {
          id: Math.random(),
          employee_name: e.name,
          employee_employee_id: e.id,
          check_in_time: new Date().toISOString(),
          status: late ? "late" : "checked_in",
        },
        ...prev,
      ].slice(0, 8));
    }
  }

  const rec = state;
  const faceBox = rec.face_box || null;
  const statusColor =
    rec.attendance_status === "REJECTED"
      ? "text-rose-600"
      : rec.attendance_status === "DUPLICATE"
      ? "text-slate-500"
      : rec.recognized
      ? "text-emerald-600"
      : "text-amber-600";

  return (
    <DashboardShell>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Attendance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time identity verification + liveness detection + automatic check-in.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slateish-800 text-xs cursor-pointer">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={autoVerify}
              onChange={(e) => setAutoVerify(e.target.checked)}
            />
            Auto verify
          </label>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slateish-800 text-xs cursor-pointer">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={simulateMode}
              onChange={(e) => {
                const v = e.target.checked;
                setSimulateMode(v);
                if (v) stopCamera();
                else startCamera();
              }}
            />
            Demo simulation (no camera)
          </label>
          {!cameraReady && !simulateMode && (
            <button className="btn-primary" onClick={startCamera}>
              <Camera className="w-4 h-4" />
              Start Camera
            </button>
          )}
          {cameraReady && !simulateMode && (
            <button className="btn-danger" onClick={stopCamera}>
              <VideoOff className="w-4 h-4" />
              Stop Camera
            </button>
          )}
          {!processing ? (
            <button className="btn-secondary" onClick={simulateMode ? runSimulated : runVerify}>
              <RefreshCw className="w-4 h-4" /> Verify Now
            </button>
          ) : (
            <span className="btn-secondary !opacity-60">
              <RefreshCw className="w-4 h-4 animate-spin" /> Processing…
            </span>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              {simulateMode ? (
                <span className="badge-amber">SIMULATED FEED</span>
              ) : cameraReady ? (
                <span className="badge-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                  LIVE CAMERA
                </span>
              ) : (
                <span className="badge-red">CAMERA OFFLINE</span>
              )}
              <span className="text-xs text-slate-500">
                {processing ? "Verifying frame…" : "Idle — awaiting frame"}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Resolution · {cameraReady ? (videoRef.current?.videoWidth || "—") : "—"} ×{" "}
              {cameraReady ? (videoRef.current?.videoHeight || "—") : "—"}
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video grid place-items-center">
            {simulateMode ? (
              <SimulatedFeed box={faceBox} />
            ) : cameraReady ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                {faceBox && <FaceBoxOverlay box={faceBox} />}
              </>
            ) : (
              <div className="text-center max-w-md p-8">
                <div className="w-16 h-16 rounded-2xl bg-slateish-800 grid place-items-center mx-auto mb-3 text-slate-400">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="font-semibold">Camera not active</div>
                <div className="text-sm text-slate-400 mt-1">
                  {cameraError || "Click Start Camera, or enable Demo simulation to see how it works."}
                </div>
              </div>
            )}

            {!faceBox && (cameraReady || simulateMode) && (
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="w-60 h-72 rounded-[32%] border-2 border-dashed border-white/30 animate-pulse" />
              </div>
            )}

            <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
              <ClockPill />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoBlock
              icon={IdCard}
              label="Identity"
              value={
                rec.recognized ? (
                  <span>
                    {rec.employee_name}{" "}
                    <span className="text-slate-400 font-normal text-xs">
                      · {rec.employee_employee_id}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400">Not verified</span>
                )
              }
            />
            <InfoBlock
              icon={User}
              label="Department"
              value={
                rec.department ? (
                  <span>{rec.department}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )
              }
            />
            <InfoBlock
              icon={Fingerprint}
              label="Recognition"
              value={
                <span className={cn("font-semibold", rec.recognized ? "text-emerald-600" : "text-slate-500")}>
                  {fmtPct((rec.recognition_confidence || 0) * 100, 1)}
                </span>
              }
            />
            <InfoBlock
              icon={ScanFace}
              label="Face Quality"
              value={
                <span className="font-semibold">
                  {fmtPct((rec.face_quality_score || 0) * 100, 1)}
                </span>
              }
            />
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LivenessBlock passed={!!rec.liveness_passed} score={rec.liveness_score} />
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slateish-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 grid place-items-center">
                  <UserCheck2 className="w-4 h-4" />
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Attendance
                </div>
              </div>
              <div className={cn("text-lg font-bold", statusColor)}>
                {rec.attendance_status
                  ? STATUS_META[rec.attendance_status]?.label ||
                    (rec.attendance_status as string).replaceAll("_", " ")
                  : "—"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {rec.attendance_message || "Awaiting verification"}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slateish-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slateish-800 grid place-items-center">
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Timestamp
                </div>
              </div>
              <div className="text-lg font-bold">
                {rec.check_in_time ? fmtDateTime(rec.check_in_time) : "—"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Camera: {simulateMode ? "DEMO-CAM-01" : "CAM-01"}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Recent check-ins
                </div>
                <div className="text-lg font-semibold">Today</div>
              </div>
              <Users className="w-4.5 h-4.5 w-[18px] h-[18px] text-slate-400" />
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
              {recent.length === 0 && (
                <div className="text-sm text-slate-500 p-4 border border-dashed border-slate-200 dark:border-slateish-800 rounded-lg text-center">
                  No recent check-ins
                </div>
              )}
              {recent.map((r) => {
                const s =
                  STATUS_META[String(r.status || "").toLowerCase?.()] ||
                  STATUS_META.present;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slateish-900"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-xs font-semibold shrink-0">
                      {initials(r.employee_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {r.employee_name}{" "}
                        <span className="text-slate-400 text-xs font-normal">
                          · {r.employee_employee_id}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {fmtDateTime(r.check_in_time)}
                      </div>
                    </div>
                    <span className={s.cls}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Security alerts
                </div>
                <div className="text-lg font-semibold">Latest</div>
              </div>
              <AlertTriangle className="w-[18px] h-[18px] text-amber-500" />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
              {events.length === 0 && (
                <div className="text-sm text-slate-500 p-4 border border-dashed border-slate-200 dark:border-slateish-800 rounded-lg text-center">
                  No security alerts
                </div>
              )}
              {events.map((e) => {
                const s = SEVERITY_META[e.severity] || SEVERITY_META.medium;
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200/70 dark:border-slateish-800"
                  >
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{e.event_type}</span>
                        <span className={s.cls}>{s.label}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {e.camera_name || e.location_name || e.description}{" "}
                        · {fmtDateTime(e.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Camera status · Site
            </div>
            <div className="space-y-2">
              <CameraPill name="CAM-01 · Main Entrance" online fps={30} />
              <CameraPill name="CAM-04 · Factory Zone B" online fps={24} />
              <CameraPill name="CAM-02 · Back Lobby" online={false} />
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slateish-800">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slateish-800 grid place-items-center">
          <Icon className="w-4 h-4 text-slate-500" />
        </div>
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
          {label}
        </div>
      </div>
      <div className="text-sm font-semibold leading-tight">{value}</div>
    </div>
  );
}

function LivenessBlock({ passed, score }: { passed: boolean; score?: number }) {
  const Icon = passed ? ShieldCheck : ShieldX;
  return (
    <div
      className={cn(
        "p-4 rounded-xl border",
        passed
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5"
          : "border-rose-200 bg-rose-50/40 dark:border-rose-500/20 dark:bg-rose-500/5"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "w-8 h-8 rounded-lg grid place-items-center",
            passed
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
          Liveness
        </div>
      </div>
      <div
        className={cn(
          "text-lg font-bold flex items-center gap-2",
          passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
        )}
      >
        {passed ? "PASS" : "FAIL"}
        <span className="text-slate-400 font-semibold text-sm">
          {fmtPct((score || 0) * 100, 1)}
        </span>
      </div>
      <div className="text-xs text-slate-500 mt-0.5">
        {passed ? "Challenge/response + texture + moire checks passed" : "Repeat verification or try better lighting"}
      </div>
    </div>
  );
}

function FaceBoxOverlay({ box }: { box: number[] }) {
  const [x1, y1, x2, y2] = box;
  // camera is shown at 16:9; compute percentage overlay
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${x1 / 640 * 100}%`,
    top: `${y1 / 480 * 100}%`,
    width: `${(x2 - x1) / 640 * 100}%`,
    height: `${(y2 - y1) / 480 * 100}%`,
    border: "2px solid rgba(16,185,129,0.9)",
    boxShadow: "0 0 0 9999px rgba(10,14,26,0.0) inset, 0 0 40px rgba(16,185,129,0.25)",
    borderRadius: 12,
  };
  return (
    <div style={style}>
      <div className="absolute -top-7 left-0 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-semibold">
        FACE DETECTED
      </div>
    </div>
  );
}

function SimulatedFeed({ box }: { box?: number[] | null }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slateish-900 via-slateish-850 to-slateish-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "radial-gradient(circle at 30% 20%, rgba(58,97,255,0.3) 0, transparent 50%), radial-gradient(circle at 70% 80%, rgba(16,185,129,0.25) 0, transparent 50%)",
      }} />
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative w-64 md:w-80 aspect-[3/4]">
          <div className="absolute inset-0 rounded-[28%] bg-gradient-to-b from-slateish-800/80 to-slateish-900/80 border border-white/10" />
          <div className="absolute left-1/2 -translate-x-1/2 top-14 w-24 h-24 rounded-full bg-gradient-to-br from-amber-200/90 via-amber-100 to-amber-300/80 border border-amber-50/30 shadow-inner" />
          <div className="absolute left-[28%] top-[30%] w-3 h-3 rounded-full bg-slate-900/80" />
          <div className="absolute right-[28%] top-[30%] w-3 h-3 rounded-full bg-slate-900/80" />
          <div className="absolute left-1/2 -translate-x-1/2 top-[40%] w-10 h-1 rounded-full bg-rose-400/80" />
          <div className="absolute left-1/2 -translate-x-1/2 top-[60%] w-40 h-56 rounded-[40%] bg-gradient-to-b from-sky-700/80 via-indigo-800/80 to-slate-900/90 border-t border-white/10" />
          <div className="absolute left-1/2 -translate-x-1/2 top-[72%] w-28 h-6 rounded-full bg-sky-400/80 mix-blend-screen blur-[2px]" />
        </div>
      </div>
      {box && <FaceBoxOverlay box={box} />}
    </div>
  );
}

function ClockPill() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-xs font-mono flex items-center gap-2">
      <Clock className="w-3.5 h-3.5" />
      {t.toLocaleTimeString()}
    </div>
  );
}

function CameraPill({
  name,
  online,
  fps,
}: {
  name: string;
  online: boolean;
  fps?: number;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200/70 dark:border-slateish-800 hover:bg-slate-50 dark:hover:bg-slateish-900">
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn("w-2 h-2 rounded-full shrink-0", online ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          <div className="text-[11px] text-slate-500">
            {online ? `ONLINE · ${fps || 30} FPS · 1080p` : "OFFLINE · last heartbeat 5m ago"}
          </div>
        </div>
      </div>
      <span className={online ? "badge-green" : "badge-red"}>
        {online ? "ONLINE" : "WARNING"}
      </span>
    </div>
  );
}
