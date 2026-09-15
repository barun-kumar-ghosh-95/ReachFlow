"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import DataTable, { Column } from "@/components/DataTable";
import { Search, Filter, Download, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import {
  apiFetch,
  fmtDateTime,
  fmtPct,
  STATUS_META,
  initials,
} from "@/lib/utils";
import Modal from "@/components/Modal";

export default function AttendancePage() {
  const token = useAuth((s) => s.token);
  const role = useAuth((s) => s.role);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [data, setData] = useState<any>({ total: 0, records: [] });
  const [loading, setLoading] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        });
        const r = await apiFetch(`/attendance?${p.toString()}`, { token });
        setData(r);
      } catch {
        setData(demoAttendance);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, dateFrom, dateTo, statusFilter, employeeFilter, token]);

  const cols: Column<any>[] = [
    {
      key: "employee",
      header: "Employee",
      className: "w-64",
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-xs font-semibold">
            {initials(r.employee_name)}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{r.employee_name}</div>
            <div className="text-[11px] text-slate-500 font-mono truncate">
              {r.employee_employee_id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "check_in_time",
      header: "Check-in",
      accessor: (r) => (
        <div>
          <div className="text-sm">{fmtDateTime(r.check_in_time)}</div>
          <div className="text-[11px] text-slate-500">
            Conf. {fmtPct((r.recognition_confidence || 0) * 100, 0)} · Live{" "}
            {fmtPct((r.liveness_score || 0) * 100, 0)}
          </div>
        </div>
      ),
    },
    {
      key: "check_out_time",
      header: "Check-out",
      accessor: (r) => <div className="text-sm">{fmtDateTime(r.check_out_time) || "—"}</div>,
    },
    {
      key: "location",
      header: "Location",
      accessor: (r) => <span className="text-sm">{r.location_name || "—"}</span>,
    },
    {
      key: "ip",
      header: "IP / Device",
      accessor: (r) => (
        <span className="text-sm font-mono text-xs">{r.ip_address || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) => {
        const m =
          STATUS_META[String(r.status || "").toLowerCase?.()] ||
          STATUS_META[String(r.status || "")] ||
          STATUS_META.present;
        return <span className={m.cls}>{m.label}</span>;
      },
    },
  ];

  return (
    <DashboardShell>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Log</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review daily records, statuses, verifications, and make corrections.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-outline" onClick={() => {}}>
            <Download className="w-4 h-4" /> CSV
          </button>
          {(role === "admin" || role === "hr") && (
            <button className="btn-primary" onClick={() => setShowManual(true)}>
              <Plus className="w-4 h-4" /> Manual entry
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full md:w-56">
            <label className="label">From</label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-full md:w-56">
            <label className="label">To</label>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-full md:w-56">
            <label className="label">Status</label>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="late">Late</option>
              <option value="early_departure">Early Departure</option>
              <option value="absent">Absent</option>
              <option value="manual_correction">Manual Correction</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">&nbsp;</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search employee / ID…"
                value={employeeFilter}
                onChange={(e) => {
                  setEmployeeFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <button
            className="btn-ghost"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setStatusFilter("");
              setEmployeeFilter("");
              setPage(1);
            }}
          >
            <Filter className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      <DataTable
        columns={cols}
        data={data.records}
        page={page}
        pageSize={pageSize}
        total={data.total}
        onPageChange={setPage}
        loading={loading}
        emptyText="No attendance records match the current filters."
      />

      {showManual && (
        <ManualEntryModal
          onClose={() => setShowManual(false)}
          token={token!}
          onDone={() => {
            setShowManual(false);
            setPage(1);
          }}
        />
      )}
    </DashboardShell>
  );
}

function ManualEntryModal({
  onClose,
  token,
  onDone,
}: {
  onClose: () => void;
  token: string;
  onDone: () => void;
}) {
  const [employee_id, setEmp] = useState<string>("1");
  const [checkin, setCheckin] = useState<string>(new Date().toISOString().slice(0, 16));
  const [checkout, setCheckout] = useState<string>("");
  const [reason, setReason] = useState("Camera was offline — manual entry approved by HR.");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!employee_id || !checkin) return;
    setSaving(true);
    setErr(null);
    try {
      await apiFetch("/attendance/manual", {
        method: "POST",
        token,
        body: JSON.stringify({
          employee_id: Number(employee_id),
          check_in_time: new Date(checkin).toISOString(),
          check_out_time: checkout ? new Date(checkout).toISOString() : null,
          reason,
        }),
      });
      onDone();
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Manual attendance correction" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Employee ID</label>
          <input className="input" value={employee_id} onChange={(e) => setEmp(e.target.value)} placeholder="1" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Check-in</label>
            <input
              type="datetime-local"
              className="input"
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Check-out</label>
            <input
              type="datetime-local"
              className="input"
              value={checkout}
              onChange={(e) => setCheckout(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Reason (required, min 10 chars)</label>
          <textarea
            className="input min-h-[92px]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {err && <div className="text-sm text-rose-600">{err}</div>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving || reason.length < 10} onClick={submit}>
          {saving ? "Saving…" : "Save correction"}
        </button>
      </div>
    </Modal>
  );
}

const demoAttendance = {
  total: 5,
  records: [
    {
      id: 1, employee_name: "Rahul Sharma", employee_employee_id: "EMP001",
      check_in_time: "2025-01-20T09:28:00Z", check_out_time: "2025-01-20T18:05:00Z",
      location_name: "Main Entrance", ip_address: "192.168.1.101",
      recognition_confidence: 0.97, liveness_score: 0.92, status: "checked_in",
    },
    {
      id: 2, employee_name: "Ananya Verma", employee_employee_id: "EMP002",
      check_in_time: "2025-01-20T09:45:00Z", check_out_time: "2025-01-20T18:10:00Z",
      location_name: "Main Entrance", ip_address: "192.168.1.102",
      recognition_confidence: 0.93, liveness_score: 0.89, status: "late",
    },
    {
      id: 3, employee_name: "Karan Kapoor", employee_employee_id: "EMP003",
      check_in_time: "2025-01-20T09:15:00Z", check_out_time: "2025-01-20T17:30:00Z",
      location_name: "Main Entrance", ip_address: "192.168.1.103",
      recognition_confidence: 0.95, liveness_score: 0.90, status: "early_departure",
    },
    {
      id: 4, employee_name: "Sneha Iyer", employee_employee_id: "EMP004",
      check_in_time: "2025-01-20T09:00:00Z", check_out_time: "2025-01-20T18:00:00Z",
      location_name: "Main Entrance", ip_address: "192.168.1.104",
      recognition_confidence: 0.96, liveness_score: 0.91, status: "checked_out",
    },
    {
      id: 5, employee_name: "Arjun Patel", employee_employee_id: "EMP005",
      check_in_time: null, check_out_time: null,
      location_name: null, ip_address: null,
      recognition_confidence: null, liveness_score: null, status: "absent",
    },
  ],
};
