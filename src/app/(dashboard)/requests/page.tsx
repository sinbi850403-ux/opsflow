import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildOverdueWhere, buildUnassignedWhere } from "@/lib/date";
import { Header } from "@/components/layout/Header";
import { STATUS_LABELS, TYPE_LABELS, PRIORITY_LABELS, VALID_STATUSES, VALID_TYPES, VALID_PRIORITIES } from "@/types";
import Link from "next/link";
import { RequestList } from "./RequestList";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE     = 100;

interface PageProps {
  searchParams: { status?: string; type?: string; priority?: string; q?: string; overdue?: string; assignee?: string; mine?: string; page?: string; pageSize?: string; };
}

function safeInt(value: string | undefined, fallback: number, min = 1): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return isNaN(n) || n < min ? fallback : n;
}

async function getPageData(sp: PageProps["searchParams"], currentUserId: string) {
  const page     = safeInt(sp.page, 1);
  const pageSize = Math.min(safeInt(sp.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const skip     = (page - 1) * pageSize;
  const status   = sp.status   && VALID_STATUSES.includes(sp.status as never)   ? sp.status   : undefined;
  const type     = sp.type     && VALID_TYPES.includes(sp.type as never)         ? sp.type     : undefined;
  const priority = sp.priority && VALID_PRIORITIES.includes(sp.priority as never) ? sp.priority : undefined;
  const where: Record<string, unknown> = {};
  if (status)   where.status   = status;
  if (type)     where.type     = type;
  if (priority) where.priority = priority;
  if (sp.q) { where.OR = [{ title: { contains: sp.q, mode: "insensitive" } }, { description: { contains: sp.q, mode: "insensitive" } }]; }
  if (sp.overdue === "true") Object.assign(where, buildOverdueWhere());
  if (sp.mine === "open") { where.assigneeId = currentUserId; where.NOT = { status: "done" }; }
  else if (sp.assignee === "__unassigned__") Object.assign(where, buildUnassignedWhere());
  else if (sp.assignee && sp.assignee !== "") where.assigneeId = sp.assignee;
  const [totalCount, requests, users] = await prisma.$transaction([
    prisma.request.count({ where }),
    prisma.request.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize, include: { assignee: { select: { name: true } }, createdBy: { select: { name: true } } } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return { requests, users, totalCount, totalPages, page, pageSize };
}

function buildPageUrl(sp: PageProps["searchParams"], targetPage: number): string {
  const params = new URLSearchParams();
  if (sp.q)        params.set("q",        sp.q);
  if (sp.status)   params.set("status",   sp.status);
  if (sp.type)     params.set("type",     sp.type);
  if (sp.priority) params.set("priority", sp.priority);
  if (sp.overdue)  params.set("overdue",  sp.overdue);
  if (sp.assignee) params.set("assignee", sp.assignee);
  if (sp.mine)     params.set("mine",     sp.mine);
  if (sp.pageSize && sp.pageSize !== String(DEFAULT_PAGE_SIZE)) params.set("pageSize", sp.pageSize);
  params.set("page", String(targetPage));
  return `/requests?${params.toString()}`;
}

function buildExportUrl(sp: PageProps["searchParams"]): string {
  const params = new URLSearchParams();
  if (sp.q)        params.set("q",        sp.q);
  if (sp.status)   params.set("status",   sp.status);
  if (sp.type)     params.set("type",     sp.type);
  if (sp.priority) params.set("priority", sp.priority);
  if (sp.overdue)  params.set("overdue",  sp.overdue);
  const qs = params.toString();
  return `/api/requests/export${qs ? `?${qs}` : ""}`;
}

export default async function RequestsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id ?? "";
  const { requests, users, totalCount, totalPages, page, pageSize } = await getPageData(searchParams, currentUserId);
  const isMineOpen = searchParams.mine === "open";
  const hasFilter  = !!(searchParams.status || searchParams.type || searchParams.priority || searchParams.q || searchParams.overdue || searchParams.assignee || isMineOpen);
  const clearUrl   = "/requests";
  const exportUrl  = buildExportUrl(searchParams);
  const assigneeFilterLabel = (() => {
    if (isMineOpen) return "__mine__";
    if (searchParams.assignee === "__unassigned__") return "미지정 · 미완료";
    if (searchParams.assignee) return users.find((u) => u.id === searchParams.assignee)?.name ?? null;
    return null;
  })();

  return (
    <div className="flex flex-col">
      <Header title="요청 목록" />
      <main className="flex-1 p-6 space-y-0">
        <div className="bg-white rounded-t-xl border border-b-0 border-gray-200">
          <div className="flex items-center gap-3 px-5 py-3.5 flex-wrap">
            <form className="flex items-center gap-2 flex-wrap flex-1">
              {searchParams.pageSize && searchParams.pageSize !== String(DEFAULT_PAGE_SIZE) && <input type="hidden" name="pageSize" value={searchParams.pageSize} />}
              <input type="text" name="q" defaultValue={searchParams.q ?? ""} placeholder="요청 검색..." className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44" />
              <select name="status" defaultValue={searchParams.status ?? ""} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 bg-white">
                <option value="">전체 상태</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select name="type" defaultValue={searchParams.type ?? ""} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 bg-white">
                <option value="">전체 유형</option>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select name="priority" defaultValue={searchParams.priority ?? ""} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 bg-white">
                <option value="">전체 우선순위</option>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {!isMineOpen && (
                <select name="assignee" defaultValue={searchParams.assignee ?? ""} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 bg-white">
                  <option value="">전체 담당자</option>
                  <option value="__unassigned__">미지정 (미완료)</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
              <button type="submit" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors">검색</button>
              {hasFilter && <Link href={clearUrl} className="text-sm text-gray-400 hover:text-gray-600 px-1">초기화</Link>}
            </form>
            <div className="flex items-center gap-2 shrink-0">
              <a href={exportUrl} download className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                CSV
                {hasFilter && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-600">필터 적용</span>}
              </a>
              <Link href="/requests/new" className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">+ 새 요청</Link>
            </div>
          </div>
        </div>
        <RequestList requests={requests} users={users} totalCount={totalCount} page={page} pageSize={pageSize} totalPages={totalPages} hasFilter={hasFilter} overdueFilter={searchParams.overdue === "true"} assigneeFilterLabel={assigneeFilterLabel} isMineOpen={isMineOpen} pageUrl={(targetPage) => buildPageUrl(searchParams, targetPage)} clearUrl={clearUrl} />
      </main>
    </div>
  );
}
