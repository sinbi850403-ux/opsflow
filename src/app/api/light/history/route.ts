import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseLimit(value: string | null) {
  if (!value) return 50;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(parsed, 100);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));

    const items = await prisma.lightUploadHistory.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[LIGHT_HISTORY_GET_ERROR]", error);

    return NextResponse.json(
      {
        message: "업로드 이력을 불러오지 못했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}