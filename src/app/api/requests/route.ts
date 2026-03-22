import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDueDateEndOfDay, buildOverdueWhere, buildUnassignedWhere } from "@/lib/date";
import { VALID_STATUSES, VALID_PRIORITIES, VALID_TYPES } from "@/types";

const DEFAULT_PAGE      = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE     = 100;

function safeInt(value: string | null, fallback: number, min = 1): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return isNaN(n) || n < min ? fallback : n;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const page     = safeInt(searchParams.get("page"),     DEFAULT_PAGE);
    const pageSize = Math.min(safeInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const skip     = (page - 1) * pageSize;

    const statusParam   = searchParams.get("status");
    const typeParam     = searchParams.get("type");
    const priorityParam = searchParams.get("priority");
    const q             = searchParams.get("q");
    const overdue       = searchParams.get("overdue");
    const assigneeParam = searchParams.get("assignee");
    const mine          = searchParams.get("mine");

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

    if (mine === "open") {
      where.assigneeId = session.user.id;
      where.NOT = { status: "done" };
    } else if (assigneeParam === "__unassigned__") {
      Object.assign(where, buildUnassignedWhere());
    } else if (assigneeParam && assigneeParam !== "") {
      where.assigneeId = assigneeParam;
    }

    const [totalCount, data] = await prisma.$transaction([
      prisma.request.count({ where }),
      prisma.request.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          assignee:  { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    return NextResponse.json({ data, totalCount, totalPages, page, pageSize });
  } catch (err) {
    console.error("[GET /api/requests]", err);
    return NextResponse.json({ error: "요청 목록을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, description, type, priority, assigneeId, requesterName, requesterContact, source, dueDate } = body;

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (!trimmedTitle)
      return NextResponse.json({ error: "제목은 필수입니다." }, { status: 400 });

    const resolvedType     = type ?? "other";
    const resolvedPriority = priority ?? "medium";

    if (!VALID_TYPES.includes(resolvedType))
      return NextResponse.json({ error: `유효하지 않은 유형입니다: ${resolvedType}` }, { status: 400 });
    if (!VALID_PRIORITIES.includes(resolvedPriority))
      return NextResponse.json({ error: `유효하지 않은 우선순위입니다: ${resolvedPriority}` }, { status: 400 });

    if (assigneeId) {
      const exists = await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true } });
      if (!exists)
        return NextResponse.json({ error: "지정된 담당자가 존재하지 않습니다." }, { status: 400 });
    }

    const parsedDueDate = parseDueDateEndOfDay(dueDate);
    if (dueDate && !parsedDueDate)
      return NextResponse.json({ error: "마감일 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요." }, { status: 400 });

    const request = await prisma.request.create({
      data: {
        title:            trimmedTitle,
        description:      typeof description === "string" ? description.trim() || null : null,
        type:             resolvedType,
        priority:         resolvedPriority,
        status:           "new",
        assigneeId:       assigneeId || null,
        createdById:      session.user.id,
        requesterName:    typeof requesterName    === "string" ? requesterName.trim()    || null : null,
        requesterContact: typeof requesterContact === "string" ? requesterContact.trim() || null : null,
        source:           typeof source === "string" ? source.trim() || null : null,
        dueDate:          parsedDueDate,
      },
    });

    await prisma.activity.create({
      data: { type: "created", message: "요청이 생성되었습니다.", requestId: request.id, userId: session.user.id },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    console.error("[POST /api/requests]", err);
    return NextResponse.json({ error: "요청 등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
