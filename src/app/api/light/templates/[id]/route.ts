import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "삭제할 템플릿 ID가 없습니다." },
        { status: 400 }
      );
    }

    const existing = await prisma.lightMappingTemplate.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "삭제할 템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.lightMappingTemplate.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      id,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "템플릿 삭제 중 오류가 발생했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
}