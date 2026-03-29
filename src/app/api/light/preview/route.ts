import { NextResponse } from "next/server";
import { readWorkbookPreview } from "@/lib/light/workbook-reader";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function hasAllowedExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: Request) {
  try {
    console.log("[LIGHT_PREVIEW_ROUTE_HIT]");

    const formData = await request.formData();
    const file = formData.get("file");
    const sheetNameValue = formData.get("sheetName");

    const sheetName =
      typeof sheetNameValue === "string" && sheetNameValue.trim()
        ? sheetNameValue.trim()
        : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "업로드할 파일을 선택해주세요." },
        { status: 400 }
      );
    }

    if (!file.name) {
      return NextResponse.json(
        { message: "파일명이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (!hasAllowedExtension(file.name)) {
      return NextResponse.json(
        { message: "엑셀 또는 CSV 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "파일 크기는 10MB 이하만 가능합니다." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = readWorkbookPreview(buffer, file.name, sheetName);

    console.log("[LIGHT_PREVIEW_RESULT]", {
      fileName: result.fileName,
      sheetName: result.sheetName,
      rowCount: result.rowCount,
      previewCount: result.previewCount,
    });

    try {
      const saved = await prisma.lightUploadHistory.create({
        data: {
          fileName: result.fileName || file.name,
          sheetName: result.sheetName || sheetName || "",
          sheetNames: result.sheetNames,
          headers: result.headers,
          rowCount:
            typeof result.rowCount === "number" && Number.isFinite(result.rowCount)
              ? result.rowCount
              : 0,
          previewCount:
            typeof result.previewCount === "number" && Number.isFinite(result.previewCount)
              ? result.previewCount
              : 0,
        },
      });

      console.log("[LIGHT_UPLOAD_HISTORY_CREATED]", saved.id, saved.fileName);
    } catch (historyError) {
      console.error("[LIGHT_UPLOAD_HISTORY_CREATE_ERROR]", historyError);
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "파일 미리보기 생성 중 오류가 발생했습니다.";

    console.error("[LIGHT_PREVIEW_ROUTE_ERROR]", error);

    return NextResponse.json({ message }, { status: 500 });
  }
}
