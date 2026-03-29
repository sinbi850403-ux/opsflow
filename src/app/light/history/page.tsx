import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { LightUploadHistory } from "@prisma/client";

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
    hour12: false,
  }).format(date);
}

function getJsonArrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export default async function LightHistoryPage() {
  const items: LightUploadHistory[] = await prisma.lightUploadHistory.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const totalUploadCount = items.length;
  const totalRowsSum = items.reduce((sum, item) => sum + item.rowCount, 0);
  const previewRowsSum = items.reduce((sum, item) => sum + item.previewCount, 0);
  const totalHeaderCount = items.reduce(
    (sum, item) => sum + getJsonArrayLength(item.headers),
    0
  );
  const latestUploadedAt =
    items.length > 0 ? formatDateTime(items[0].createdAt) : "-";

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
                  fontSize: "40px",
                  lineHeight: 1.15,
                  fontWeight: 800,
                }}
              >
                업로드 이력
              </h1>
              <p
                style={{
                  margin: "12px 0 0",
                  fontSize: "15px",
                  lineHeight: 1.7,
                  color: "#475569",
                }}
              >
                최근 업로드된 파일의 미리보기 실행 기록입니다. 각 기록에서 시트명,
                전체 행 수, 미리보기 행 수, 헤더 수를 확인할 수 있습니다.
              </p>
            </div>

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
              label: "최근 기록 수",
              value: totalUploadCount.toLocaleString("ko-KR"),
              color: "#0f172a",
            },
            {
              label: "전체 행 합계",
              value: totalRowsSum.toLocaleString("ko-KR"),
              color: "#0f172a",
            },
            {
              label: "미리보기 행 합계",
              value: previewRowsSum.toLocaleString("ko-KR"),
              color: "#0369a1",
            },
            {
              label: "헤더 수 합계",
              value: totalHeaderCount.toLocaleString("ko-KR"),
              color: "#0f172a",
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
                  fontSize: "28px",
                  fontWeight: 800,
                  color: card.color,
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
            최근 업로드 시각
          </p>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "18px",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {latestUploadedAt}
          </p>
        </section>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                아직 저장된 업로드 이력이 없습니다.
              </p>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "14px",
                  color: "#64748b",
                }}
              >
                Light 페이지에서 파일 미리보기를 실행하면 이력이 저장됩니다.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "900px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {[
                      "업로드 일시",
                      "파일명",
                      "시트명",
                      "전체 행",
                      "미리보기 행",
                      "헤더 수",
                      "상세",
                    ].map((label) => (
                      <th
                        key={label}
                        style={{
                          padding: "14px 16px",
                          borderBottom: "1px solid #e5e7eb",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#475569",
                          textAlign: label.includes("행") || label === "헤더 수" ? "right" : "left",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: LightUploadHistory) => (
                    <tr key={item.id}>
                      <td
                        style={{
                          padding: "14px 16px",
                          borderBottom: "1px solid #f1f5f9",
                          fontSize: "14px",
                          color: "#334155",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          borderBottom: "1px solid #f1f5f9",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#0f172a",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.fileName || "-"}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          borderBottom: "1px solid #f1f5f9",
                          fontSize: "14px",
                          color: "#334155",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.sheetName || "-"}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          borderBottom: "1px solid #f1f5f9",
                          fontSize: "14px",
                          color: "#334155",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.rowCount.toLocaleString("ko-KR")}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          borderBottom: "1px solid #f1f5f9",
                          fontSize: "14px",
                          color: "#0369a1",
                          fontWeight: 700,
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.previewCount.toLocaleString("ko-KR")}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          borderBottom: "1px solid #f1f5f9",
                          fontSize: "14px",
                          color: "#334155",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getJsonArrayLength(item.headers).toLocaleString("ko-KR")}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          borderBottom: "1px solid #f1f5f9",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Link
                          href={`/light/history/${item.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "10px 12px",
                            borderRadius: "12px",
                            textDecoration: "none",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontSize: "13px",
                            fontWeight: 700,
                          }}
                        >
                          상세보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
