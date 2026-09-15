"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import DataTable, { Column } from "@/components/DataTable";
import { apiFetch, fmtDate, initials, STATUS_META, fmtPct, pct } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { Plus, Search, UserPlus, Camera as CamIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";

export default function EmployeesPage() {
  const token = useAuth((s) => s.token);
  const role = useAuth((s) => s.role);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [data, setData] = useState<any>({ total: 0, employees: [] });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [depts, setDepts] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState<number | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [showFaceReg, setShowFaceReg] = useState<null | { id: number; name: string }>(null);
  const canWrite = role === "admin" || role === "hr";

  useEffect(() => {
    (async () => {
      try {
        const d = await apiFetch("/employees/departments/list", { token });
        setDepts(d || []);
      } catch {}
    })();
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
          ...(search ? { search } : {}),
          ...(deptFilter ? { department_id: String(deptFilter) } : {}),
        });
        const res = await apiFetch(`/employees?${params.toString()}`, { token });
        setData(res);
      } catch {
        setData({ total: 5, employees: demoEmployees });
      } finally {
        setLoading(false);
      }
    })();
  }, [page, search, deptFilter, token]);

  const cols: Column<any>[] = [
    {
      key: "name",
      header: "Employee",
      className: "w-72",
      accessor: (e) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-sm font-semibold">
            {initials(`${e.first_name} ${e.last_name}`)}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{e.first_name} {e.last_name}</div>
            <div className="text-[11px] text-slate-500 truncate">{e.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "employee_id",
      header: "Employee ID",
      accessor: (e) => <span className="font-mono text-xs">{e.employee_id}</span>,
    },
    {
      key: "designation",
      header: "Designation",
      accessor: (e) => <span className="text-sm">{e.designation || "—"}</span>,
    },
    {
      key: "department",
      header: "Department",
      accessor: (e) => {
        const d = depts.find((x) => x.id === e.department_id);
        return <span className="text-sm">{d?.name || "—"}</span>;
      },
    },
    {
      key: "joining_date",
      header: "Joining",
      accessor: (e) => <span className="text-sm">{fmtDate(e.joining_date)}</span>,
    },
    {
      key: "is_active",
      header: "Status",
      accessor: (e) =>
        e.is_active ? <span className="badge-green">Active</span> : <span className="badge-red">Inactive</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-40",
      accessor: (e) => (
        <div className="flex items-center justify-end gap-1">
          {canWrite && (
            <button
              className="btn-ghost !py-1.5 text-xs"
              onClick={() =>
                setShowFaceReg({ id: e.id, name: `${e.first_name} ${e.last_name}` })
              }
            >
              <CamIcon className="w-4 h-4" /> Face
            </button>
          )}
          <Link className="btn-ghost !py-1.5 text-xs" href={`/employees/${e.id}`}>
            Profile →
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Register workforce, manage profiles and face enrollments.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9 !w-64"
              placeholder="Search ID, name, email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input !w-48"
            value={deptFilter ?? ""}
            onChange={(e) => {
              setDeptFilter(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
          >
            <option value="">All departments</option>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {canWrite && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={cols}
        data={data.employees}
        page={page}
        pageSize={pageSize}
        total={data.total}
        onPageChange={setPage}
        loading={loading}
        emptyText="No employees found — try adjusting filters or add your first employee."
        rowHref={(r) => `/employees/${r.id}`}
      />

      {showCreate && (
        <CreateEmployeeModal
          onClose={() => setShowCreate(false)}
          depts={depts}
          token={token!}
          onCreated={() => {
            setShowCreate(false);
            setPage(1);
          }}
        />
      )}
      {showFaceReg && (
        <FaceRegisterModal
          onClose={() => setShowFaceReg(null)}
          employee={showFaceReg}
          token={token!}
          onDone={() => setShowFaceReg(null)}
        />
      )}
    </DashboardShell>
  );
}

function CreateEmployeeModal({
  onClose,
  depts,
  token,
  onCreated,
}: {
  onClose: () => void;
  depts: any[];
  token: string;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<any>({
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    designation: "",
    department_id: depts[0]?.id || "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setErr(null);
    setSaving(true);
    try {
      await apiFetch("/employees", {
        method: "POST",
        body: JSON.stringify({ ...form, department_id: form.department_id || null }),
        token,
      });
      onCreated();
    } catch (e: any) {
      setErr(e?.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add new employee" onClose={onClose}>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-1">
          <label className="label">Employee ID</label>
          <input
            className="input"
            value={form.employee_id}
            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            placeholder="EMP006"
          />
        </div>
        <div className="md:col-span-1">
          <label className="label">Designation</label>
          <input
            className="input"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
            placeholder="Software Engineer"
          />
        </div>
        <div>
          <label className="label">First name</label>
          <input
            className="input"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Last name</label>
          <input
            className="input"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Work email</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Department</label>
          <select
            className="input"
            value={form.department_id || ""}
            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
          >
            <option value="">—</option>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {err && <div className="mt-3 text-sm text-rose-600">{err}</div>}
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Creating…" : "Create employee"}
        </button>
      </div>
    </Modal>
  );
}

function FaceRegisterModal({
  onClose,
  employee,
  token,
  onDone,
}: {
  onClose: () => void;
  employee: { id: number; name: string };
  token: string;
  onDone: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [live, setLive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [simulate, setSimulate] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<null | boolean>(null);

  async function start() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setLive(true);
    } catch {
      setMsg("Camera blocked / unavailable — enable Demo capture instead.");
    }
  }

  function stop() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setLive(false);
  }

  async function capture() {
    let b64: string | null = null;
    if (simulate) {
      const cnv = document.createElement("canvas");
      cnv.width = 400;
      cnv.height = 400;
      const ctx = cnv.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, 400, 400);
      g.addColorStop(0, "#e0e7ff");
      g.addColorStop(1, "#c7d2fe");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 400, 400);
      ctx.beginPath();
      ctx.fillStyle = "#fde68a";
      ctx.arc(200, 180, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(170, 170, 8, 0, Math.PI * 2);
      ctx.arc(230, 170, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(200, 210, 24, 0, Math.PI);
      ctx.stroke();
      b64 = cnv.toDataURL("image/jpeg", 0.9);
    } else if (videoRef.current && canvasRef.current) {
      const v = videoRef.current;
      const c = canvasRef.current;
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(v, 0, 0);
      b64 = c.toDataURL("image/jpeg", 0.9);
    }
    if (!b64) return;
    const body = new FormData();
    body.append("face_base64", b64);
    body.append("is_primary", "true");
    try {
      const res = await apiFetch(`/employees/${employee.id}/face`, {
        method: "POST",
        body,
        token,
      });
      setOk(res.success);
      setMsg(
        res.success
          ? `${res.message} (quality ${fmtPct((res.quality_score || 0) * 100, 1)})`
          : res.message
      );
    } catch (e: any) {
      setOk(false);
      setMsg(e?.message || "Failed to register");
    }
  }

  useEffect(() => () => stop(), []);

  return (
    <Modal
      title={`Register face · ${employee.name}`}
      onClose={() => {
        stop();
        onDone();
      }}
      wide
    >
      <div className="grid md:grid-cols-2 gap-5">
        <div className="aspect-video rounded-xl bg-slate-900 relative overflow-hidden">
          {live ? (
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          ) : simulate ? (
            <div className="w-full h-full bg-gradient-to-br from-indigo-400 via-brand-500 to-brand-700 grid place-items-center text-white/80 text-sm">
              Demo face synthesizer
            </div>
          ) : (
            <div className="w-full h-full grid place-items-center text-slate-400 text-sm">
              Camera preview
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Controls
          </div>
          <label className="inline-flex items-center gap-2 mb-3 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slateish-800 cursor-pointer">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={simulate}
              onChange={(e) => {
                setSimulate(e.target.checked);
                if (e.target.checked) stop();
              }}
            />
            Use demo synthesized face (no camera)
          </label>
          <div className="flex flex-wrap gap-2">
            {!live && !simulate && (
              <button className="btn-primary" onClick={start}>
                Start Camera
              </button>
            )}
            {live && (
              <button className="btn-danger" onClick={stop}>
                Stop
              </button>
            )}
            <button
              className="btn-secondary"
              onClick={capture}
              disabled={!live && !simulate}
            >
              Capture &amp; Register
            </button>
          </div>
          <div className="mt-4 text-xs text-slate-500 space-y-1">
            <div>· Ensure a single face, front-facing, even lighting.</div>
            <div>· The system will auto-reject blurry images or multiple faces.</div>
            <div>· Multiple enrollments improve robustness across lighting &amp; angles.</div>
          </div>
          {msg && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                ok === true
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : ok === false
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                  : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
              }`}
            >
              {msg}
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

const demoEmployees = [
  {
    id: 1, employee_id: "EMP001", first_name: "Rahul", last_name: "Sharma",
    email: "rahul.sharma@visionattend.ai", designation: "Senior Software Engineer",
    department_id: 1, joining_date: "2024-02-01", is_active: true,
  },
  {
    id: 2, employee_id: "EMP002", first_name: "Ananya", last_name: "Verma",
    email: "ananya.verma@visionattend.ai", designation: "Product Manager",
    department_id: 2, joining_date: "2024-03-14", is_active: true,
  },
  {
    id: 3, employee_id: "EMP003", first_name: "Karan", last_name: "Kapoor",
    email: "karan.kapoor@visionattend.ai", designation: "HR Executive",
    department_id: 3, joining_date: "2024-04-02", is_active: true,
  },
  {
    id: 4, employee_id: "EMP004", first_name: "Sneha", last_name: "Iyer",
    email: "sneha.iyer@visionattend.ai", designation: "Security Officer",
    department_id: 4, joining_date: "2024-05-20", is_active: true,
  },
  {
    id: 5, employee_id: "EMP005", first_name: "Arjun", last_name: "Patel",
    email: "arjun.patel@visionattend.ai", designation: "Operations Analyst",
    department_id: 5, joining_date: "2024-06-05", is_active: true,
  },
];

import { useRef } from "react";
