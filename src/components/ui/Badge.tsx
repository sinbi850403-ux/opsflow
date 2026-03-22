import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS } from "@/types";

const statusStyles: Record<string, string> = {
  new:              "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  reviewing:        "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200",
  in_progress:      "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
  waiting_external: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  done:             "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
  on_hold:          "bg-gray-100 text-gray-600",
};

const priorityStyles: Record<string, string> = {
  low:    "bg-gray-100 text-gray-500",
  medium: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  high:   "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  urgent: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
};

const typeStyles: Record<string, string> = {
  cs:       "bg-blue-50 text-blue-600",
  order:    "bg-indigo-50 text-indigo-600",
  purchase: "bg-violet-50 text-violet-600",
  delivery: "bg-cyan-50 text-cyan-700",
  refund:   "bg-rose-50 text-rose-600",
  internal: "bg-slate-100 text-slate-600",
  other:    "bg-gray-100 text-gray-500",
};

const base = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${base} ${statusStyles[status] ?? "bg-gray-100 text-gray-500"}`}>
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`${base} ${priorityStyles[priority] ?? "bg-gray-100 text-gray-500"}`}>
      {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`${base} ${typeStyles[type] ?? "bg-gray-100 text-gray-500"}`}>
      {TYPE_LABELS[type as keyof typeof TYPE_LABELS] ?? type}
    </span>
  );
}
