import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildOverdueWhere } from "@/lib/date";
import { VALID_STATUSES, VALID_TYPES, VALID_PRIORITIES, STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, SOURCE_LABELS } from "@/types";

function esc(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatDate(val: Date | null | undefined): string {
  if (!val) return "";
  return new Date(val).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const statusParam   = searchParams.get("status");
    const typeParam     = searchParams.get("type");
    const priorityParam = searchParams.get("priority");
    const q             = searchParams.get("q");
    const overdue       = searchParams.get("overdue");

    const status   = statusParam   && VALID_STATUSES.includes(statusParam as never)   ? statusParam   : null;
    const type     = typeParam     && VALID_TYPES.includes(typeParam as never)         ? typeParam     : null;
    const priority = priorityParam && VALID_PRIORITIES.includes(priorityParam as never) ? priorityParam : null;

    const where: Record<string, unknown> = {};
    if (status)   where.status   = status;
    if (type)     where.type     = type;
    if (priority) where.priority = priority;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
    if (overdue === "true") Object.assign(where, buildOverdueWhere());

    const requests = await prisma.request.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { assignee: { select: { name: true } }, createdBy: { select: { name: true } } },
    });

    const headers = ["제목","설명","유형","상태","우선순위","요청자명","연락처","접수경로","담당자","마감일","생성일","생성자"];

    const rows = requests.map((req) => [
      esc(req.title),
      esc(req.description),
      esc(TYPE_LABELS[req.type as keyof typeof TYPE_LABELS]         ?? req.type),
      esc(STATUS_LABELS[req.status as keyof typeof STATUS_LABELS]   ?? req.status),
      esc(PRIORITY_LABELS[req.priority as keyof typeof PRIORITY_LABELS] ?? req.priority),
      esc(req.requesterName),
      esc(req.requesterContact),
      esc(req.source ? SOURCE_LABELS[req.source] ?? req.source : ""),
      esc(req.assignee?.name),
      esc(formatDate(req.dueDate)),
      esc(formatDate(req.createdAt)),
      esc(req.createdBy.name),
    ]);

    const BOM        = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const today      = new Date().toISOString().slice(0, 10);
    const asciiName  = `opsflow-requests-${today}.csv`;
    const utf8Name   = encodeURIComponent(`OpsFlow_요청목록_${today}.csv`).replace(/'/g, "%27");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/requests/export]", err);
    return NextResponse.json({ error: "CSV 내보내기 중 오류가 발생했습니다." }, { status: 500 });
  }
}
