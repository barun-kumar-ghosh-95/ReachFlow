"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import DataTable, { Column } from "@/components/DataTable";
import { ShieldAlert, Search, Filter, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { apiFetch, fmtDateTime, SEVERITY_META } from "@/lib/utils";
import Modal from "@/components/Modal";

export default function SecurityPage() {
  const token = useAuth((s) => s.token);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [data, setData] = useState<any>({ total: 0, events: [] });
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [resolveId, setResolveId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
          ...(severity ? { severity } : {}),
          ...(type ? { event_type: type } : {}),
          ...(from ? { date_from: from } : {}),
          ...(to ? { date_to: to } : {}),
        });
        const r = await apiFetch(`/analytics/security/events?${p.toString()}`, { token });
        setData(r);
      } catch {
        setData({ total: mock.length, events: mock });
      } finally {
        setLoading(false);
      }
    })();
  }, [page, severity, type, from, to, token]);

  const cols: Column<any>[] = [
    {
      key: "severity",
      header: "Severity",
      className: "w-28",
      accessor: (e) => {
        const s = SEVERITY_META[e.severity] || SEVERITY_META.medium;
        return (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            <span className={s.cls}>{s.label}</span>
          </div>
        );
      },
    },
    {
      key: "event_type",
      header: "Type",
      accessor: (e) => (
        <span className="text-sm font-medium capitalize">{String(e.event_type).replaceAll("_", " ")}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      accessor: (e) => <div className="text-sm truncate max-w-md">{e.description || "—"}</div>,
    },
    {
      key: "entity",
      header: "Camera / Location",
      accessor: (e) => (
        <div className="text-sm">
          <div>{e.camera_name || "—"}</div>
          <div className="text-[11px] text-slate-500">{e.location_name || "—"}</div>
        </div>
      ),
    },
    {
      key: "employee",
      header: "Person",
      accessor: (e) => (
        <div className="text-sm">
          <div>{e.employee_name || "Unknown"}</div>
          <div className="text-[11px] text-slate-500">{e.ip_address || "—"}</div>
        </div>
      ),
    },
    {
      key: "time",
      header: "Detected",
      accessor: (e) => <span className="text-sm">{fmtDateTime(e.created_at)}</span>,
    },
    {
      key: "status",
      header: "Status",
      accessor: (e) => (
        <div className="flex items-center gap-2">
          {e.is_resolved ? <span className="badge-green">Resolved</span> : <span className="badge-red">Open</span>}
        </div>
      ),
    },
    {
      key: "act",
      header: "",
      className: "text-right w-32",
      accessor: (e) =>
        !e.is_resolved ? (
          <button className="btn-ghost text-xs !py-1.5" onClick={() => setResolveId(e.id)}>
            <CheckCircle2 className="w-4 h-4" /> Resolve
          </button>
        ) : null,
    },
  ];

  return (
    <DashboardShell>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Events</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Spoof attempts, unknown faces, failed verifications, suspicious patterns.
          </p>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full md:w-44">
            <label className="label">Severity</label>
            <select
              className="input"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="w-full md:w-64">
            <label className="label">Type</label>
            <select
              className="input"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All types</option>
              <option value="unknown_face">Unknown face</option>
              <option value="spoof_attempt">Spoof attempt</option>
              <option value="failed_recognition">Failed recognition</option>
              <option value="multiple_faces">Multiple faces</option>
              <option value="suspicious_pattern">Suspicious pattern</option>
              <option value="camera_offline">Camera offline</option>
            </select>
          </div>
          <div className="w-full md:w-44">
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-full md:w-44">
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            className="btn-ghost"
            onClick={() => {
              setSeverity("");
              setType("");
              setFrom("");
              setTo("");
              setPage(1);
            }}
          >
            <Filter className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      <DataTable
        columns={cols}
        data={data.events}
        page={page}
        pageSize={pageSize}
        total={data.total}
        onPageChange={setPage}
        loading={loading}
        emptyText="No security events in the current window."
      />

      {resolveId != null && (
        <ResolveModal
          id={resolveId}
          onClose={() => setResolveId(null)}
          token={token!}
          onDone={() => {
            setResolveId(null);
            setPage(1);
          }}
        />
      )}
    </DashboardShell>
  );
}

function ResolveModal({
  id,
  onClose,
  token,
  onDone,
}: {
  id: number;
  onClose: () => void;
  token: string;
  onDone: () => void;
}) {
  const [note, setNote] = useState("Reviewed by security team — no further action required.");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit() {
    if (note.length < 5) return;
    setSaving(true);
    setErr(null);
    try {
      const p = new URLSearchParams({ resolution_notes: note });
      await apiFetch(`/analytics/security/events/${id}/resolve?${p.toString()}`, {
        method: "POST",
        token,
      });
      onDone();
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title="Resolve security event" onClose={onClose}>
      <div>
        <label className="label">Resolution notes</label>
        <textarea className="input min-h-[120px]" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {err && <div className="mt-3 text-sm text-rose-600">{err}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={saving || note.length < 5}>
          {saving ? "Resolving…" : "Mark resolved"}
        </button>
      </div>
    </Modal>
  );
}

const mock = [
  {
    id: 1, severity: "critical", event_type: "spoof_attempt",
    description: "Possible spoof attempt — liveness score 28%",
    camera_name: "CAM-04", location_name: "Factory Zone B",
    employee_name: "Unknown", ip_address: "192.168.1.88",
    is_resolved: false, created_at: new Date().toISOString(),
  },
  {
    id: 2, severity: "high", event_type: "unknown_face",
    description: "Unknown face detected 8 times in 20 min window",
    camera_name: "CAM-04", location_name: "Factory Zone B",
    employee_name: null, ip_address: "192.168.1.88",
    is_resolved: false, created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3, severity: "medium", event_type: "suspicious_pattern",
    description: "12 failed recognitions last hour — review camera quality",
    camera_name: "CAM-02", location_name: "Back Lobby",
    employee_name: null, ip_address: "192.168.1.74",
    is_resolved: false, created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4, severity: "low", event_type: "multiple_faces",
    description: "3 faces detected in single-frame check-in zone",
    camera_name: "CAM-01", location_name: "Main Entrance",
    employee_name: "Rahul Sharma", ip_address: "192.168.1.10",
    is_resolved: true, created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];
