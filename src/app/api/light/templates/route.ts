import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STANDARD_FIELD_KEYS = ["itemName", "qty", "amount", "date"] as const;

type StandardFieldKey = (typeof STANDARD_FIELD_KEYS)[number];
type StandardFieldMapping = Record<StandardFieldKey, string>;

function createEmptyMapping(): StandardFieldMapping {
  return {
    itemName: "",
    qty: "",
    amount: "",
    date: "",
  };
}

function sanitizeMapping(raw: unknown): StandardFieldMapping {
  const emptyMapping = createEmptyMapping();

  if (!raw || typeof raw !== "object") {
    return emptyMapping;
  }

  const source = raw as Record<string, unknown>;

  for (const key of STANDARD_FIELD_KEYS) {
    emptyMapping[key] = typeof source[key] === "string" ? source[key] : "";
  }

  return emptyMapping;
}

function hasAtLeastOneMappedField(mapping: StandardFieldMapping) {
  return Object.values(mapping).some((value) => Boolean(value.trim()));
}

function serializeTemplate(template: {
  id: string;
  name: string;
  mapping: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: template.id,
    name: template.name,
    mapping: sanitizeMapping(template.mapping),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const templates = await prisma.lightMappingTemplate.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      templates: templates.map(serializeTemplate),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "템플릿 목록을 불러오는 중 오류가 발생했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: unknown;
      mapping?: unknown;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { message: "템플릿 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    const mapping = sanitizeMapping(body.mapping);

    if (!hasAtLeastOneMappedField(mapping)) {
      return NextResponse.json(
        { message: "저장할 매핑이 없습니다." },
        { status: 400 }
      );
    }

    const existing = await prisma.lightMappingTemplate.findUnique({
      where: {
        name,
      },
    });

    const template = existing
      ? await prisma.lightMappingTemplate.update({
          where: {
            name,
          },
          data: {
            mapping,
          },
        })
      : await prisma.lightMappingTemplate.create({
          data: {
            name,
            mapping,
          },
        });

    return NextResponse.json({
      action: existing ? "updated" : "created",
      template: serializeTemplate(template),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "템플릿 저장 중 오류가 발생했습니다.";

    return NextResponse.json({ message }, { status: 500 });
  }
}