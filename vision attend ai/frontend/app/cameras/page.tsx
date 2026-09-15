"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import DataTable, { Column } from "@/components/DataTable";
import { Camera, Plus, Activity, MapPin, HardDrive } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { apiFetch, fmtDateTime } from "@/lib/utils";
import Modal from "@/components/Modal";

export default function CamerasPage() {
  const token = useAuth((s) => s.token);
  const [page, setPage] = useState(1);
  const [cams, setCams] = useState<any[]>([]);
  const [devs, setDevs] = useState<any[]>([]);
  const [locs, setLocs] = useState<any[]>([]);
  const [showCam, setShowCam] = useState(false);
  const [showDev, setShowDev] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await apiFetch("/infrastructure/cameras", { token });
        setCams(c);
      } catch {
        setCams(demoCams);
      }
      try {
        const d = await apiFetch("/infrastructure/devices", { token });
        setDevs(d);
      } catch {
        setDevs(demoDevs);
      }
      try {
        const l = await apiFetch("/infrastructure/locations", { token });
        setLocs(l);
      } catch {
        setLocs(demoLocs);
      }
    })();
  }, [token]);

  const camCols: Column<any>[] = [
    {
      key: "camera_id",
      header: "Camera",
      className: "w-64",
      accessor: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slateish-800 dark:to-slateish-900 grid place-items-center">
            <Camera className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <div className="font-medium text-sm">{c.name}</div>
            <div className="font-mono text-[11px] text-slate-500">{c.camera_id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (c) => {
        const s = String(c.status || "offline");
        const cls =
          s === "online" ? "badge-green" : s === "warning" ? "badge-amber" : "badge-red";
        const label = s.toUpperCase();
        return (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
              s === "online" ? "bg-emerald-500 animate-pulse" : s === "warning" ? "bg-amber-500" : "bg-rose-500"
            }`}
            />
            <span className={cls}>{label}</span>
          </div>
        );
      },
    },
    {
      key: "location",
      header: "Location / Zone",
      accessor: (c) => (
        <div className="text-sm">
          <div>{c.location_name || "—"}</div>
          <div className="text-[11px] text-slate-500">{c.assigned_zone || "—"}</div>
        </div>
      ),
    },
    {
      key: "perf",
      header: "FPS · Res",
      accessor: (c) => (
        <div className="text-sm">
          <div>{c.fps ? `${c.fps.toFixed(0) + " FPS" : "—"}</div>
          <div className="text-[11px] text-slate-500">{c.resolution || "—"}</div>
        </div>
      ),
    },
    {
      key: "heartbeat",
      header: "Last heartbeat",
      accessor: (c) => <span className="text-sm">{fmtDateTime(c.last_heartbeat)}</span>,
    },
  ];

  const devCols: Column<any>[] = [
    {
      key: "device_id",
      header: "Device",
      accessor: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slateish-800 grid place-items-center">
            <HardDrive className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <div className="font-medium text-sm">{d.name}</div>
            <div className="font-mono text-[11px] text-slate-500">{d.device_id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      accessor: (d) => (
        <span className="text-sm capitalize">{String(d.device_type || "desktop").replaceAll("_", " ")}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      accessor: (d) => <span className="text-sm">{d.location_name || "—"}</span>,
    },
    {
      key: "registered",
      header: "State",
      accessor: (d) => (
        <div className="flex flex-col gap-1">
          <div>{d.is_registered ? <span className="badge-green">Registered</span> : <span className="badge-slate">Unregistered</span>}</div>
          <div>{d.allowed_for_attendance ? <span className="badge-blue">Attendance allowed</span> : <span className="badge-slate">Blocked</span>}</div>
        </div>
      ),
    },
    {
      key: "last_seen",
      header: "Last seen",
      accessor: (d) => (
        <div className="text-sm">
          <div>{d.ip_address || "—"}</div>
          <div className="text-[11px] text-slate-500">{fmtDateTime(d.last_seen)}</div>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cameras, Devices &amp; Locations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your site infrastructure: cameras, registered devices and geofenced locations.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-outline" onClick={() => setShowDev(true)}>
            <HardDrive className="w-4 h-4" /> Add device
          </button>
          <button className="btn-primary" onClick={() => setShowCam(true)}>
            <Camera className="w-4 h-4" /> Add camera
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
        <Camera className="w-5 h-5 text-slate-500" />
        <h2 className="text-lg font-semibold">Cameras</h2>
      </div>
      <DataTable columns={camCols} data={cams} total={cams.length} page={1} onPageChange={() => {}} pageSize={20} />
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
        <HardDrive className="w-5 h-5 text-slate-500" />
        <h2 className="text-lg font-semibold">Devices</h2>
      </div>
      <DataTable columns={devCols} data={devs} total={devs.length} page={1} onPageChange={() => {}} pageSize={20} />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold">Locations ({locs.length})</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {(locs.length === 0 ? (
            <div className="card p-6 text-slate-500 col-span-3">
              No locations configured.
            </div>
          ) : (
            locs.map((l) => (
            <div key={l.id ?? l.name} className="card p-5 card-hover">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-base">{l.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{l.address || "—"}</div>
                </div>
                <div
                  className={`badge ${l.is_active ? "badge-green" : "badge-red"}`}
                >
                  {l.is_active ? "Active" : "Inactive"}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    Lat / Lng
                  </div>
                  <div className="font-mono">
                    {l.latitude?.toFixed?.(4) || "—"} / {l.longitude?.toFixed?.(4) || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    Geofence
                  </div>
                  <div className="font-mono">
                    {l.geofence_radius_meters != null ? `${l.geofence_radius_meters} m` : "—"}
                  </div>
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {showCam && (
        <AddCameraModal
          onClose={() => setShowCam(false)}
          locations={locs}
          token={token!}
          onDone={() => setShowCam(false)}
        />
      )}
      {showDev && (
        <AddDeviceModal
          onClose={() => setShowDev(false)}
          locations={locs}
          token={token!}
          onDone={() => setShowDev(false)}
        />
      )}
    </DashboardShell>
  );
}

function AddCameraModal({
  onClose,
  locations,
  token,
  onDone,
}: {
  onClose: () => void;
  locations: any[];
  token: string;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    camera_id: "",
    name: "",
    location_id: locations[0]?.id || "",
    assigned_zone: "",
    stream_url: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      await apiFetch("/infrastructure/cameras", {
        method: "POST",
        token,
        body: JSON.stringify({ ...form, location_id: form.location_id || undefined }),
      });
      onDone();
    } catch (e: any) {
        setErr(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title="Add camera" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Camera ID</label>
            <input
              className="input"
              value={form.camera_id}
              onChange={(e) => setForm({ ...form, camera_id: e.target.value })}
              placeholder="CAM-05"
            />
          </div>
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Reception Desk"
            />
          </div>
          <div>
            <label className="label">Location</label>
            <select
              className="input"
              value={form.location_id}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
            >
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Zone</label>
            <input
              className="input"
              value={form.assigned_zone}
              onChange={(e) => setForm({ ...form, assigned_zone: e.target.value })}
              placeholder="Lobby-2"
            />
          </div>
        </div>
        <div>
          <label className="label">RTSP / Stream URL</label>
          <input
            className="input"
            value={form.stream_url}
            onChange={(e) => setForm({ ...form, stream_url: e.target.value })}
            placeholder="rtsp://192.168.1.100/cam05"
          />
        </div>
        {err && <div className="text-sm text-rose-600">{err}</div>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving} onClick={submit}>
          {saving ? "Creating…" : "Create camera"}
        </button>
      </div>
    </Modal>
  );
}

function AddDeviceModal({ onClose, locations, token, onDone }: any) {
  const [form, setForm] = useState({
    device_id: "",
    name: "",
    device_type: "desktop",
    location_id: locations[0]?.id || "",
    mac_address: "",
    allowed_for_attendance: true,
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      await apiFetch("/infrastructure/devices", {
        method: "POST",
        token,
        body: JSON.stringify({
          ...form,
        location_id: form.location_id || undefined,
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
    <Modal title="Add device" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Device ID</label>
            <input className="input" value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })} placeholder="WORKSTATION-12" />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Reception PC" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })}>
              <option value="desktop">Desktop</option>
              <option value="laptop">Laptop</option>
              <option value="cctv">CCTV Station</option>
              <option value="edge_device">Edge Device</option>
              <option value="tablet">Tablet</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <select className="input" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
              <option value="">—</option>
              {locations.map((l: any) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">MAC address</label>
            <input className="input font-mono" value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} placeholder="00:1A:2B:3C:4D:FF" />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-brand-600"
                checked={form.allowed_for_attendance}
                onChange={(e) => setForm({ ...form, allowed_for_attendance: e.target.checked })}
              />
              Allow attendance from this device
            </label>
          </div>
        </div>
        {err && <div className="text-sm text-rose-600">{err}</div>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={saving} onClick={submit}>
          {saving ? "Creating…" : "Create device"}
        </button>
      </div>
    </Modal>
  );
}

const demoCams = [
  {
    id: 1, camera_id: "CAM-01", name: "Main Entrance Camera",
    location_name: "Main Entrance", status: "online",
    fps: 30, resolution: "1920x1080",
    assigned_zone: "Lobby-1", last_heartbeat: new Date().toISOString(),
  },
  {
    id: 2, camera_id: "CAM-04", name: "Factory Zone B Camera",
    location_name: "Factory Zone B", status: "online",
    fps: 25, resolution: "1280x720",
    assigned_zone: "Factory-B", last_heartbeat: new Date().toISOString(),
  },
  {
    id: 3, camera_id: "CAM-02", name: "Back Lobby Camera",
    location_name: "Main Entrance", status: "offline",
    fps: null, resolution: null, assigned_zone: "Lobby-2",
    last_heartbeat: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
];
const demoDevs = [
  {
    id: 1, device_id: "ADMIN-PC-01", name: "Admin Workstation",
    device_type: "desktop", location_name: "Main Entrance",
    is_registered: true, allowed_for_attendance: true,
    ip_address: "192.168.1.10",
    last_seen: new Date().toISOString(),
  },
  {
    id: 2, device_id: "CAM-STATION-04", name: "Main Entrance CCTV Station",
    device_type: "cctv", location_name: "Main Entrance",
    is_registered: true, allowed_for_attendance: true,
    ip_address: "192.168.1.14",
    last_seen: new Date().toISOString(),
  },
];
const demoLocs = [
  {
    id: 1, name: "Main Entrance", address: "100 AI Park, Main Gate",
    latitude: 12.9716, longitude: 77.5946, geofence_radius_meters: 100, is_active: true,
  },
  {
    id: 2, name: "Factory Zone B", address: "100 AI Park, Factory B",
    latitude: 12.9722, longitude: 77.5950, geofence_radius_meters: 80, is_active: true,
  },
];
