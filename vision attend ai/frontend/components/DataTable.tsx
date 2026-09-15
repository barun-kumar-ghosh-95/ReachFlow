"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  idKey?: keyof T;
  emptyText?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (p: number) => void;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  rowHref?: (row: T) => string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  idKey = "id" as any,
  emptyText = "No data",
  page,
  pageSize,
  total,
  onPageChange,
  loading,
  onRowClick,
  rowHref,
}: Props<T>) {
  const showPagination = page != null && pageSize != null && total != null && onPageChange;
  const totalPages = showPagination ? Math.max(1, Math.ceil((total as number) / (pageSize as number))) : 1;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.className}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="!text-center !py-12 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="!text-center !py-16 text-slate-500 text-sm"
                >
                  <div className="mx-auto w-14 h-14 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slateish-800 grid place-items-center text-slate-400 mb-3">
                    ∅
                  </div>
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((r) => {
                const id = r[idKey as any];
                const content = (
                  <tr
                    key={id}
                    className={cn(
                      onRowClick && "cursor-pointer",
                      rowHref && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(r)}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={c.className}>
                        {c.accessor ? c.accessor(r) : r[c.key]}
                      </td>
                    ))}
                  </tr>
                );
                if (rowHref) {
                  return (
                    <Link key={id} href={rowHref(r)} className="contents">
                      {content}
                    </Link>
                  );
                }
                return content;
              })
            )}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slateish-900 text-sm">
          <div className="text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">{total}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="btn-outline !py-1.5 !px-2.5 text-xs disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs text-slate-500">
              Page {page} / {totalPages}
            </div>
            <button
              className="btn-outline !py-1.5 !px-2.5 text-xs disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
