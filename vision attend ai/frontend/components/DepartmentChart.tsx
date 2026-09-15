"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { apiFetch, fmtPct } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";

const COLORS = [
  "#3a61ff",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
];

export default function DepartmentChart() {
  const token = useAuth((s) => s.token);
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const rows = await apiFetch("/analytics/attendance/departments", { token });
        setData(rows);
      } catch {
        setData([
          { department: "Engineering", total: 85, present: 78, attendance_rate: 91.8 },
          { department: "Product", total: 18, present: 16, attendance_rate: 88.9 },
          { department: "Human Resources", total: 10, present: 10, attendance_rate: 100 },
          { department: "Security", total: 14, present: 12, attendance_rate: 85.7 },
          { department: "Operations", total: 28, present: 24, attendance_rate: 85.7 },
          { department: "Finance", total: 12, present: 11, attendance_rate: 91.7 },
        ]);
      }
    })();
  }, [token]);

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis
            dataKey="department"
            type="category"
            width={130}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(58,97,255,0.06)" }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.25)",
              fontSize: 12,
              boxShadow: "0 12px 40px -12px rgba(15,22,41,0.25)",
            }}
            formatter={(v: any, n: any) => {
              if (n === "attendance_rate") return [fmtPct(v), "Attendance"];
              return [v, n === "present" ? "Present" : n];
            }}
          />
          <Bar dataKey="present" name="Present" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
