export function parseDueDateEndOfDay(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year  = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day   = parseInt(match[3], 10);
  const date  = new Date(year, month, day, 23, 59, 59, 999);
  return isNaN(date.getTime()) ? null : date;
}

export function toDateInputValue(val: Date | string | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isOverdue(
  dueDate: Date | string | null | undefined,
  status: string
): boolean {
  if (!dueDate || status === "done") return false;
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return d < new Date();
}

export function buildOverdueWhere(): Record<string, unknown> {
  return {
    dueDate: { lt: new Date() },
    NOT: { status: "done" },
  };
}

export function buildUnassignedWhere(): Record<string, unknown> {
  return {
    assigneeId: null,
    NOT: { status: "done" },
  };
}
