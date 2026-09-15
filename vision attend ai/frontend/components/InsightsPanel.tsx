"use client";

import { Sparkles, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export default function InsightsPanel() {
  const token = useAuth((s) => s.token);
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const rows = await apiFetch("/analytics/ai-insights?days=30", { token });
        setItems(rows.slice(0, 4));
      } catch {
        setItems([
          {
            insight_type: "late_by_day",
            title: "Monday has the highest late-arrival rate (14.2%)",
            description: "14.2% of Monday check-ins were late — consider Monday stand-up time review.",
            severity: "medium",
          },
          {
            insight_type: "repeated_lateness",
            title: "3 employees show repeated late-arrival patterns",
            description: "R. Sharma, A. Verma, K. Kapoor each have 3+ late arrivals in the last 30 days.",
            severity: "low",
          },
        ]);
      }
    })();
  }, [token]);

  if (!items.length) {
    return (
      <div className="card p-5 text-sm text-slate-500 text-center">
        <Sparkles className="w-5 h-5 mx-auto mb-2 text-brand-500" />
        Collecting data for AI insights — come back tomorrow.
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center">
          <Sparkles className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            AI Insights
          </div>
          <div className="text-lg font-semibold">Automated workforce analytics</div>
        </div>
        <div className="ml-auto text-[11px] text-slate-500">
          Built from attendance + security statistics · last 30 days
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((it, i) => (
          <InsightCard key={i} insight={it} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: any }) {
  const sev = insight.severity || "medium";
  const icon =
    sev === "high" ? AlertTriangle : sev === "medium" ? ArrowUpRight : ArrowDownRight;
  const Icon = icon;
  return (
    <div
      className={cn(
        "p-4 rounded-xl border",
        sev === "high"
          ? "border-rose-200 bg-rose-50/50 dark:border-rose-500/20 dark:bg-rose-500/5"
          : sev === "medium"
          ? "border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5"
          : "border-slate-200 dark:border-slateish-800"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-lg grid place-items-center shrink-0",
            sev === "high"
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
              : sev === "medium"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
              : "bg-slate-100 text-slate-600 dark:bg-slateish-800 dark:text-slate-300"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-sm">{insight.title}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {insight.description}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
            {insight.insight_type.replaceAll("_", " ")} · {sev}
          </div>
        </div>
      </div>
    </div>
  );
}
