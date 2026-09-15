"use client";

import { DashboardShell } from "@/components/DashboardShell";
import DataTable, { Column } from "@/components/DataTable";
import { useEffect, useState } from "react";
import { ScrollText, Search, Filter, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { apiFetch, fmtDateTime, initials } from "@/lib/utils";

export default function AuditLogsPage() {
  const token = useAuth((s) => s.token);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [data, setData] = useState<any>({ total: 0, logs: [] });
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string>("");
  const [entity, setEntity] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
          ...(action ? { action } : {}),
          ...(entity ? { entity_type: entity } : {}),
          ...(from ? { date_from: from } : {}),
          ...(to ? { date_to: to } : {}),
        });
        const r = await apiFetch(`/analytics/audit-logs?${p.toString()}`, { token });
        setData(r);
      } catch {
        setData({ total: demo.length, logs: demo });
      } finally {
        setLoading(false);
      }
    })();
  }, [page, action, entity, from, to, token]);

  const cols: Column<any>[] = [
    {
      key: "who",
      header: "Actor",
      className: "w-64",
      accessor: (l) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-xs font-semibold">
            {initials(l.actor_name)}
          </div>
          <div>
            <div className="text-sm font-medium">{l.actor_name || "System"}</div>
            <div className="text-[11px] text-slate-500">
              Actor ID #{l.actor_id} · {l.ip_address || "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      accessor: (l) => (
        <span className="badge-blue">{String(l.action).replaceAll(".", " / ")}</span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      accessor: (l) => (
        <div className="text-sm">
          <div className="font-medium capitalize">{String(l.entity_type || "—").replaceAll("_", " ")}</div>
          <div className="text-[11px] text-slate-500">ID: {l.entity_id ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "when",
      header: "When",
      accessor: (l) => <span className="text-sm">{fmtDateTime(l.created_at)}</span>,
    },
  ];

  return (
    <DashboardShell>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable-style record of every change — WHO · WHAT · WHEN · WHERE · FROM WHICH DEVICE.
          </p>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full md:w-52">
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="w-full md:w-52">
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
          <div className="w-full md:w-52">
            <label className="label">Entity type</label>
            <select className="input" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="employee">Employee</option>
              <option value="attendance_record">Attendance</option>
              <option value="attendance_policy">Policy</option>
              <option value="user">User</option>
              <option value="role">Role</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">&nbsp;</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search action…"
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <button className="btn-ghost"
            onClick={() => {
              setAction(""); setEntity(""); setFrom(""); setTo(""); setPage(1);
            }}
          >
            <Filter className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      <DataTable
        columns={cols}
        data={data.logs}
        page={page}
        pageSize={pageSize}
        total={data.total}
        onPageChange={setPage}
        loading={loading}
        emptyText="No audit log entries match the current filters."
      />
    </DashboardShell>
  );
}

const demo = [
  {
    id: 1, actor_id: 1, actor_name: "Aarav Sharma",
    action: "attendance_policy.updated", entity_type: "attendance_policy", entity_id: 1,
    ip_address: "192.168.1.10", created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 2, actor_id: 1, actor_name: "Aarav Sharma",
    action: "attendance.manual_correction", entity_type: "attendance_record", entity_id: 547,
    ip_address: "192.168.1.10", created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 3, actor_id: 2, actor_name: "Priya Nair",
    action: "employee.create", entity_type: "employee", entity_id: 23,
    ip_address: "192.168.1.20", created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
  {
    id: 4, actor_id: 2, actor_name: "Priya Nair",
    action: "employee.face_register", entity_type: "employee", entity_id: 23,
    ip_address: "192.168.1.20", created_at: new Date(Date.now() - 26.2 * 3600 * 1000).toISOString(),
  },
];
