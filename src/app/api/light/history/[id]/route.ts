import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: Request, context: RouteContext) {
  const id = context.params.id;

  if (!id) {
    return NextResponse.json(
      {
        message: "삭제할 이력 ID가 없습니다.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    await prisma.lightUploadHistory.delete({
      where: {
        id,
      },
    });

    revalidatePath("/light/history");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("[LIGHT_HISTORY_DELETE_ERROR]", error);

    return NextResponse.json(
      {
        message: "업로드 이력 삭제 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}
