"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "brand" | "emerald" | "rose" | "amber" | "blue" | "violet";
  mini?: boolean;
  trend?: { up?: boolean; value: string };
}

const TONES: Record<string, string> = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
  emerald:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  blue: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  violet:
    "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "brand",
  mini = false,
  trend,
}: Props) {
  return (
    <div
      className={cn(
        "card card-hover",
        mini ? "p-4" : "p-5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {label}
          </div>
          <div
            className={cn(
              "mt-2 font-bold tracking-tight",
              mini ? "text-2xl" : "text-3xl"
            )}
          >
            {value}
          </div>
          {hint && !mini && (
            <div className="text-xs text-slate-500 mt-2 dark:text-slate-400">
              {hint}
            </div>
          )}
          {trend && (
            <div className="mt-2 text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span
                className={cn(
                  "font-semibold",
                  trend.up ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {trend.up ? "▲" : "▼"} {trend.value}
              </span>
              vs last week
            </div>
          )}
        </div>
        <div
          className={cn(
            "grid place-items-center rounded-xl",
            TONES[tone],
            mini ? "w-9 h-9" : "w-11 h-11"
          )}
        >
          <Icon className={cn(mini ? "w-5 h-5" : "w-6 h-6")} />
        </div>
      </div>
    </div>
  );
}
