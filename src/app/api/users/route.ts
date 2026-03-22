import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    console.error("[GET /api/users]", err);
    return NextResponse.json({ error: "사용자 목록을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "관리자만 새 사용자를 생성할 수 있습니다." }, { status: 403 });

  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    const trimmedName     = typeof name     === "string" ? name.trim()  : "";
    const trimmedEmail    = typeof email    === "string" ? email.trim().toLowerCase() : "";
    const trimmedPassword = typeof password === "string" ? password : "";
    const resolvedRole    = role === "admin" ? "admin" : "member";

    if (!trimmedName)  return NextResponse.json({ error: "이름은 필수입니다." }, { status: 400 });
    if (!trimmedEmail) return NextResponse.json({ error: "이메일은 필수입니다." }, { status: 400 });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail))
      return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
    if (trimmedPassword.length < 8)
      return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 400 });

    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    const user = await prisma.user.create({
      data: { name: trimmedName, email: trimmedEmail, password: hashedPassword, role: resolvedRole },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("[POST /api/users]", err);
    return NextResponse.json({ error: "사용자 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
