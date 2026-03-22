import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDueDateEndOfDay, toDateInputValue } from "@/lib/date";
import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, SOURCE_LABELS, VALID_STATUSES, VALID_PRIORITIES, VALID_TYPES } from "@/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const request = await prisma.request.findUnique({
      where: { id: params.id },
      include: {
        assignee:  { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        memos: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
        activities: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!request) return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json(request);
  } catch (err) {
    console.error("[GET /api/requests/[id]]", err);
    return NextResponse.json({ error: "요청을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const current = await prisma.request.findUnique({ where: { id: params.id } });
    if (!current) return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });

    const body = await req.json();
    const { status, assigneeId, priority, type, title, description, dueDate, requesterName, requesterContact, source } = body;

    if (status    !== undefined && !VALID_STATUSES.includes(status))
      return NextResponse.json({ error: `유효하지 않은 상태입니다: ${status}` }, { status: 400 });
    if (priority  !== undefined && !VALID_PRIORITIES.includes(priority))
      return NextResponse.json({ error: `유효하지 않은 우선순위입니다: ${priority}` }, { status: 400 });
    if (type      !== undefined && !VALID_TYPES.includes(type))
      return NextResponse.json({ error: `유효하지 않은 유형입니다: ${type}` }, { status: 400 });
    if (assigneeId) {
      const exists = await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true } });
      if (!exists) return NextResponse.json({ error: "지정된 담당자가 존재하지 않습니다." }, { status: 400 });
    }
    if (title !== undefined) {
      const trimmed = typeof title === "string" ? title.trim() : "";
      if (!trimmed) return NextResponse.json({ error: "제목은 필수입니다." }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    const activityLogs: { type: string; message: string }[] = [];

    if (status !== undefined && status !== current.status) {
      updateData.status = status;
      const from = STATUS_LABELS[current.status as keyof typeof STATUS_LABELS] ?? current.status;
      const to   = STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
      activityLogs.push({ type: "status_changed", message: `상태가 "${from}" → "${to}"로 변경되었습니다.` });
    }
    if (priority !== undefined && priority !== current.priority) {
      updateData.priority = priority;
      const from = PRIORITY_LABELS[current.priority as keyof typeof PRIORITY_LABELS] ?? current.priority;
      const to   = PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] ?? priority;
      activityLogs.push({ type: "priority_changed", message: `우선순위가 "${from}" → "${to}"로 변경되었습니다.` });
    }
    if (type !== undefined && type !== current.type) {
      updateData.type = type;
      const from = TYPE_LABELS[current.type as keyof typeof TYPE_LABELS] ?? current.type;
      const to   = TYPE_LABELS[type as keyof typeof TYPE_LABELS] ?? type;
      activityLogs.push({ type: "type_changed", message: `유형이 "${from}" → "${to}"로 변경되었습니다.` });
    }
    if (assigneeId !== undefined && assigneeId !== current.assigneeId) {
      updateData.assigneeId = assigneeId || null;
      if (assigneeId) {
        const a = await prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true } });
        activityLogs.push({ type: "assignee_changed", message: `담당자가 "${a?.name}"으로 지정되었습니다.` });
      } else {
        activityLogs.push({ type: "assignee_changed", message: "담당자가 해제되었습니다." });
      }
    }
    if (title !== undefined)       updateData.title       = (title as string).trim();
    if (description !== undefined) updateData.description = typeof description === "string" ? description.trim() || null : null;

    if ("dueDate" in body) {
      if (!dueDate) {
        if (current.dueDate !== null) {
          updateData.dueDate = null;
          activityLogs.push({ type: "duedate_changed", message: "마감일이 삭제되었습니다." });
        }
      } else {
        const parsed = parseDueDateEndOfDay(dueDate);
        if (!parsed) return NextResponse.json({ error: "마감일 형식이 올바르지 않습니다." }, { status: 400 });
        const prevFormatted = current.dueDate ? toDateInputValue(current.dueDate) : null;
        if (dueDate !== prevFormatted) {
          updateData.dueDate = parsed;
          activityLogs.push({
            type: "duedate_changed",
            message: prevFormatted
              ? `마감일이 "${prevFormatted}" → "${dueDate}"로 변경되었습니다.`
              : `마감일이 "${dueDate}"로 설정되었습니다.`,
          });
        }
      }
    }
    if (requesterName !== undefined) {
      const next = typeof requesterName === "string" ? requesterName.trim() || null : null;
      if (next !== current.requesterName) {
        updateData.requesterName = next;
        activityLogs.push({ type: "requester_changed", message: next ? `요청자 이름이 "${next}"으로 변경되었습니다.` : "요청자 이름이 삭제되었습니다." });
      }
    }
    if (requesterContact !== undefined) {
      const next = typeof requesterContact === "string" ? requesterContact.trim() || null : null;
      if (next !== current.requesterContact) {
        updateData.requesterContact = next;
        activityLogs.push({ type: "requester_changed", message: next ? `연락처가 "${next}"으로 변경되었습니다.` : "연락처가 삭제되었습니다." });
      }
    }
    if (source !== undefined) {
      const next = typeof source === "string" ? source.trim() || null : null;
      if (next !== current.source) {
        updateData.source = next;
        const fromLabel = current.source ? SOURCE_LABELS[current.source] ?? current.source : "미입력";
        const toLabel   = next ? SOURCE_LABELS[next] ?? next : "미입력";
        activityLogs.push({ type: "source_changed", message: `접수 경로가 "${fromLabel}" → "${toLabel}"로 변경되었습니다.` });
      }
    }

    const updated = await prisma.request.update({ where: { id: params.id }, data: updateData });
    for (const log of activityLogs) {
      await prisma.activity.create({ data: { ...log, requestId: params.id, userId: session.user.id } });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/requests/[id]]", err);
    return NextResponse.json({ error: "요청 수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const existing = await prisma.request.findUnique({ where: { id: params.id }, select: { id: true, title: true } });
    if (!existing) return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    await prisma.request.delete({ where: { id: params.id } });
    return NextResponse.json({ message: `"${existing.title}" 요청이 삭제되었습니다.` });
  } catch (err) {
    console.error("[DELETE /api/requests/[id]]", err);
    return NextResponse.json({ error: "요청 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
