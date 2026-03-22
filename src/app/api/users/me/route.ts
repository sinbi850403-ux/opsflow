import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || typeof currentPassword !== "string")
      return NextResponse.json({ error: "현재 비밀번호를 입력해주세요." }, { status: 400 });
    if (!newPassword || typeof newPassword !== "string")
      return NextResponse.json({ error: "새 비밀번호를 입력해주세요." }, { status: 400 });
    if (newPassword.length < 8)
      return NextResponse.json({ error: "새 비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
    if (newPassword !== confirmPassword)
      return NextResponse.json({ error: "새 비밀번호와 확인 비밀번호가 일치하지 않습니다." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, password: true } });
    if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid)
      return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });

    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld)
      return NextResponse.json({ error: "새 비밀번호는 현재 비밀번호와 달라야 합니다." }, { status: 400 });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: session.user.id }, data: { password: hashedPassword } });
    return NextResponse.json({ message: "비밀번호가 변경되었습니다." });
  } catch (err) {
    console.error("[PATCH /api/users/me]", err);
    return NextResponse.json({ error: "비밀번호 변경 중 오류가 발생했습니다." }, { status: 500 });
  }
}
