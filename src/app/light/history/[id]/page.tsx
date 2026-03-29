import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { LightUploadHistory } from "@prisma/client";
import DeleteHistoryButton from "@/components/light/DeleteHistoryButton";

type PageProps = {
  params: {
    id: string;
  };
};

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item : String(item)))
    .filter(Boolean);
}

export default async function LightHistoryDetailPage({ params }: PageProps) {
  const item: LightUploadHistory | null = await prisma.lightUploadHistory.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!item) {
    notFound();
  }

  const sheetNames = toStringArray(item.sheetNames);
  const headers = toStringArray(item.headers);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px 24px",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#64748b",
                }}
              >
                OPSFLOW LIGHT
              </p>
              <h1
                style={{
                  margin: "10px 0 0",
                  fontSize: "34px",
                  lineHeight: 1.2,
                  fontWeight: 800,
                }}
              >
                업로드 상세 기록
              </h1>
              <p
                style={{
                  margin: "12px 0 0",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  color: "#475569",
                }}
              >
                저장된 업로드 이력의 기본 정보와 시트 목록, 헤더 목록을 확인할 수 있습니다.
                필요하면 이 화면에서 기록을 삭제할 수 있습니다.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/light/history"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  textDecoration: "none",
                  background: "#e2e8f0",
                  color: "#0f172a",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                이력 목록
              </Link>

              <Link
                href="/light"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  textDecoration: "none",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                Light로 돌아가기
              </Link>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            {
              label: "파일명",
              value: item.fileName || "-",
              color: "#0f172a",
            },
            {
              label: "선택 시트",
              value: item.sheetName || "-",
              color: "#0f172a",
            },
            {
              label: "전체 행 수",
              value: item.rowCount.toLocaleString("ko-KR"),
              color: "#0f172a",
            },
            {
              label: "미리보기 행 수",
              value: item.previewCount.toLocaleString("ko-KR"),
              color: "#0369a1",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "20px",
                padding: "20px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#64748b",
                }}
              >
                {card.label}
              </p>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "22px",
                  fontWeight: 800,
                  color: card.color,
                  wordBreak: "break-word",
                }}
              >
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "20px",
            padding: "20px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            업로드 시각
          </p>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "18px",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {formatDateTime(item.createdAt)}
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 800,
              }}
            >
              시트 목록
            </h2>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "14px",
                color: "#64748b",
              }}
            >
              업로드 파일에서 인식된 시트 이름입니다.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              {sheetNames.length > 0 ? (
                sheetNames.map((name) => (
                  <span
                    key={name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: "999px",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    {name}
                  </span>
                ))
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#94a3b8",
                  }}
                >
                  저장된 시트 정보가 없습니다.
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 800,
              }}
            >
              헤더 목록
            </h2>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "14px",
                color: "#64748b",
              }}
            >
              업로드 파일에서 인식된 헤더입니다.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              {headers.length > 0 ? (
                headers.map((header, index) => (
                  <span
                    key={`${header}-${index}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: "999px",
                      background: "#f8fafc",
                      color: "#334155",
                      fontSize: "13px",
                      fontWeight: 700,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {header}
                  </span>
                ))
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#94a3b8",
                  }}
                >
                  저장된 헤더 정보가 없습니다.
                </p>
              )}
            </div>
          </div>
        </section>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #fecaca",
            borderRadius: "20px",
            padding: "20px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 800,
              color: "#991b1b",
            }}
          >
            기록 삭제
          </h2>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "14px",
              lineHeight: 1.7,
              color: "#7f1d1d",
            }}
          >
            삭제한 업로드 이력은 목록에서 즉시 사라집니다. 삭제 전 파일명과 내용을 다시 확인하세요.
          </p>

          <div style={{ marginTop: "16px" }}>
            <DeleteHistoryButton id={item.id} fileName={item.fileName} />
          </div>
        </section>
      </div>
    </main>
  );
}
