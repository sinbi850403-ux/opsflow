import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content } = await req.json();
    if (!content || typeof content !== "string" || !content.trim())
      return NextResponse.json({ error: "메모 내용은 필수입니다." }, { status: 400 });

    const request = await prisma.request.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!request) return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });

    const memo = await prisma.memo.create({
      data: { content: content.trim(), requestId: params.id, authorId: session.user.id },
    });

    await prisma.activity.create({
      data: { type: "memo_added", message: "메모가 추가되었습니다.", requestId: params.id, userId: session.user.id },
    });

    return NextResponse.json(memo, { status: 201 });
  } catch (err) {
    console.error("[POST /api/requests/[id]/memos]", err);
    return NextResponse.json({ error: "메모 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
