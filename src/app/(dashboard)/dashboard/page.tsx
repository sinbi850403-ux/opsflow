import Link from "next/link";

export default function DashboardPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.06)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#6b7280",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          OpsFlow Dashboard
        </p>

        <h1
          style={{
            marginTop: "16px",
            marginBottom: "12px",
            fontSize: "40px",
            lineHeight: 1.2,
            color: "#111827",
          }}
        >
          운영 자동화 대시보드
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: "700px",
            fontSize: "17px",
            lineHeight: 1.7,
            color: "#4b5563",
          }}
        >
          현재는 라이트 버전 1차 개발 단계입니다. 엑셀 업로드, 미리보기,
          컬럼 확인 기능부터 먼저 완성합니다.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "28px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/light"
            style={{
              display: "inline-block",
              background: "#111827",
              color: "#ffffff",
              padding: "14px 20px",
              borderRadius: "14px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            라이트 버전 열기
          </Link>

          <Link
            href="/requests"
            style={{
              display: "inline-block",
              background: "#ffffff",
              color: "#111827",
              padding: "14px 20px",
              borderRadius: "14px",
              fontSize: "14px",
              fontWeight: 700,
              border: "1px solid #d1d5db",
            }}
          >
            요청 목록 보기
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginTop: "32px",
          }}
        >
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "20px",
            }}
          >
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              현재 단계
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "22px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Light MVP
            </p>
          </div>

          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "20px",
            }}
          >
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              핵심 기능
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "22px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              업로드 미리보기
            </p>
          </div>

          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "20px",
            }}
          >
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              다음 단계
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "22px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              컬럼 매핑
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}