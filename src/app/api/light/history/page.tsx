import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

export default async function LightHistoryPage() {
  const items = await prisma.lightUploadHistory.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">업로드 이력</h1>
            <p className="mt-1 text-sm text-slate-600">
              최근 업로드된 파일의 미리보기 실행 기록입니다.
            </p>
          </div>

          <Link
            href="/light"
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Light로 돌아가기
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-base font-medium text-slate-800">
                아직 저장된 업로드 이력이 없습니다.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Light 페이지에서 파일 미리보기를 실행하면 이력이 저장됩니다.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-4 py-3 font-semibold">업로드 일시</th>
                    <th className="px-4 py-3 font-semibold">파일명</th>
                    <th className="px-4 py-3 font-semibold">시트명</th>
                    <th className="px-4 py-3 text-right font-semibold">전체 행</th>
                    <th className="px-4 py-3 text-right font-semibold">정상 행</th>
                    <th className="px-4 py-3 text-right font-semibold">오류 행</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-4 py-3 text-slate-700">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.fileName || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.sheetName || "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {item.totalRows.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        {item.validRowCount.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-700">
                        {item.errorRowCount.toLocaleString("ko-KR")}
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