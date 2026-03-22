import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; memoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const memo = await prisma.memo.findUnique({
      where: { id: params.memoId },
      select: { id: true, authorId: true, requestId: true, author: { select: { name: true } } },
    });

    if (!memo) return NextResponse.json({ error: "메모를 찾을 수 없습니다." }, { status: 404 });
    if (memo.requestId !== params.id) return NextResponse.json({ error: "메모를 찾을 수 없습니다." }, { status: 404 });

    const isAuthor = memo.authorId === session.user.id;
    const isAdmin  = session.user.role === "admin";
    if (!isAuthor && !isAdmin)
      return NextResponse.json({ error: "메모를 삭제할 권한이 없습니다." }, { status: 403 });

    await prisma.memo.delete({ where: { id: params.memoId } });

    const activityMessage =
      session.user.id === memo.authorId
        ? `${memo.author.name}이(가) 본인의 메모를 삭제했습니다.`
        : `${session.user.name ?? "관리자"}이(가) ${memo.author.name}의 메모를 삭제했습니다.`;

    await prisma.activity.create({
      data: { type: "memo_deleted", message: activityMessage, requestId: params.id, userId: session.user.id },
    });

    return NextResponse.json({ message: "메모가 삭제되었습니다." });
  } catch (err) {
    console.error("[DELETE /api/requests/[id]/memos/[memoId]]", err);
    return NextResponse.json({ error: "메모 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
