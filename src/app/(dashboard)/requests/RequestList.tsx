"use client";
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge, PriorityBadge, TypeBadge } from "@/components/ui/Badge";
import { isOverdue } from "@/lib/date";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/types";

interface RequestRow { id: string; title: string; description: string | null; type: string; status: string; priority: string; dueDate: Date | null; assignee: { name: string } | null; createdBy: { name: string }; createdAt: Date; }
interface User { id: string; name: string; }
interface Props { requests: RequestRow[]; users: User[]; totalCount: number; page: number; pageSize: number; totalPages: number; hasFilter: boolean; overdueFilter: boolean; assigneeFilterLabel?: string | null; isMineOpen?: boolean; pageUrl: (targetPage: number) => string; clearUrl: string; }
type BulkResult = { success: number; fail: number };
const ASSIGNEE_PLACEHOLDER = "__placeholder__";
const ASSIGNEE_UNASSIGNED  = "__unassigned__";

function formatDueDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  if (current <= 4) pages.push(1, 2, 3, 4, 5, "...", total);
  else if (current >= total - 3) pages.push(1, "...", total-4, total-3, total-2, total-1, total);
  else pages.push(1, "...", current-1, current, current+1, "...", total);
  return pages;
}

export function RequestList({ requests, users, totalCount, page, pageSize, totalPages, hasFilter, overdueFilter, assigneeFilterLabel, isMineOpen = false, pageUrl, clearUrl }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allIds = useMemo(() => requests.map((r) => r.id), [requests]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;
  function toggleAll() { if (allSelected) setSelected(new Set()); else setSelected(new Set(allIds)); }
  function toggleOne(id: string) { setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkAssigneeId, setBulkAssigneeId] = useState(ASSIGNEE_PLACEHOLDER);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  async function applyBulk(body: Record<string, unknown>) {
    if (selected.size === 0) return;
    setBulkLoading(true); setBulkResult(null);
    const results = await Promise.allSettled(Array.from(selected).map((id) => fetch(`/api/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((res) => { if (!res.ok) throw new Error("fail"); return res; })));
    const success = results.filter((r) => r.status === "fulfilled").length;
    const fail    = results.filter((r) => r.status === "rejected").length;
    setBulkResult({ success, fail });
    setSelected(new Set()); setBulkStatus(""); setBulkAssigneeId(ASSIGNEE_PLACEHOLDER);
    startTransition(() => router.refresh());
    setBulkLoading(false);
  }
  function handleBulkStatus()  { if (!bulkStatus) return; applyBulk({ status: bulkStatus }); }
  function handleBulkAssignee() { if (bulkAssigneeId === ASSIGNEE_PLACEHOLDER) return; applyBulk({ assigneeId: bulkAssigneeId === ASSIGNEE_UNASSIGNED ? null : bulkAssigneeId }); }
  const assigneeBtnEnabled = !bulkLoading && bulkAssigneeId !== ASSIGNEE_PLACEHOLDER;
  const startItem = (page - 1) * pageSize + 1;
  const endItem   = Math.min(page * pageSize, totalCount);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="space-y-3">
      {bulkResult && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${bulkResult.fail > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
          <svg className={`w-4 h-4 shrink-0 ${bulkResult.fail > 0 ? "text-amber-500" : "text-green-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={bulkResult.fail > 0 ? "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" : "M5 13l4 4L19 7"} /></svg>
          <p className={`text-sm font-medium ${bulkResult.fail > 0 ? "text-amber-700" : "text-green-700"}`}>{bulkResult.success}건 처리 완료{bulkResult.fail > 0 && ` · ${bulkResult.fail}건 실패`}</p>
          <button onClick={() => setBulkResult(null)} className={`ml-auto ${bulkResult.fail > 0 ? "text-amber-400 hover:text-amber-600" : "text-green-400 hover:text-green-600"}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200">
        {someSelected && (
          <div className="flex items-center gap-3 px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex-wrap">
            <span className="text-sm font-semibold text-indigo-700 shrink-0">{selected.size}건 선택됨</span>
            <button onClick={() => setSelected(new Set())} className="text-xs text-indigo-400 hover:text-indigo-600 shrink-0">선택 해제</button>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <div className="flex items-center gap-1.5">
                <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} disabled={bulkLoading} className="px-2.5 py-1.5 border border-indigo-200 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50">
                  <option value="">상태 선택</option>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={handleBulkStatus} disabled={bulkLoading || !bulkStatus} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{bulkLoading ? "처리 중..." : "상태 적용"}</button>
              </div>
              <div className="w-px h-5 bg-indigo-200 shrink-0" />
              <div className="flex items-center gap-1.5">
                <select value={bulkAssigneeId} onChange={(e) => setBulkAssigneeId(e.target.value)} disabled={bulkLoading} className="px-2.5 py-1.5 border border-indigo-200 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50">
                  <option value={ASSIGNEE_PLACEHOLDER}>담당자 선택</option>
                  <option value={ASSIGNEE_UNASSIGNED}>담당자 해제 (미지정)</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <button onClick={handleBulkAssignee} disabled={!assigneeBtnEnabled} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{bulkLoading ? "처리 중..." : "담당자 적용"}</button>
              </div>
            </div>
          </div>
        )}
        {isMineOpen && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 border-b border-indigo-100">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="text-xs text-indigo-700 font-medium">내 담당 · 미완료 요청만 표시 중</p>
            <Link href={clearUrl} className="text-xs text-indigo-400 hover:text-indigo-600 ml-auto">필터 해제</Link>
          </div>
        )}
        {overdueFilter && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border-b border-red-100">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-xs text-red-600 font-medium">마감일 초과 요청만 표시 중</p>
            <Link href={clearUrl} className="text-xs text-red-400 hover:text-red-600 ml-auto">필터 해제</Link>
          </div>
        )}
        {!isMineOpen && assigneeFilterLabel && assigneeFilterLabel !== "__mine__" && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-100">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <p className="text-xs text-amber-700 font-medium">{assigneeFilterLabel === "미지정 · 미완료" ? "담당자 미지정 · 미완료 요청만 표시 중" : `담당자 "${assigneeFilterLabel}" 기준으로 표시 중`}</p>
            <Link href={clearUrl} className="text-xs text-amber-500 hover:text-amber-700 ml-auto">필터 해제</Link>
          </div>
        )}
        <div className="grid grid-cols-13 gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide items-center">
          <div className="col-span-1 flex items-center justify-center"><input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={requests.length === 0} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed" /></div>
          <div className="col-span-4">요청 내용</div>
          <div className="col-span-2">유형 / 상태</div>
          <div className="col-span-1">우선순위</div>
          <div className="col-span-2">담당자</div>
          <div className="col-span-2">마감일</div>
          <div className="col-span-1">등록</div>
        </div>
        <div className="divide-y divide-gray-50">
          {requests.length === 0 && <p className="text-sm text-gray-400 text-center py-14">{isMineOpen ? "내 담당 미완료 요청이 없습니다." : hasFilter ? "검색 조건에 맞는 요청이 없습니다." : "요청이 없습니다."}</p>}
          {requests.map((req) => {
            const overdueFlag = isOverdue(req.dueDate, req.status);
            const isChecked   = selected.has(req.id);
            return (
              <div key={req.id} className={`grid grid-cols-13 gap-3 px-5 py-4 items-center transition-colors ${isChecked ? "bg-indigo-50" : overdueFlag ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}`}>
                <div className="col-span-1 flex items-center justify-center"><input type="checkbox" checked={isChecked} onChange={() => toggleOne(req.id)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" onClick={(e) => e.stopPropagation()} /></div>
                <Link href={`/requests/${req.id}`} className="col-span-4 min-w-0 group">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{req.title}</p>
                    {overdueFlag && <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">지연</span>}
                  </div>
                  {req.description && <p className="text-xs text-gray-400 truncate mt-0.5">{req.description}</p>}
                </Link>
                <div className="col-span-2 flex flex-col gap-1 items-start"><TypeBadge type={req.type} /><StatusBadge status={req.status} /></div>
                <div className="col-span-1"><PriorityBadge priority={req.priority} /></div>
                <div className="col-span-2">
                  {req.assignee ? (
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0"><span className="text-xs font-semibold text-indigo-600">{req.assignee.name[0]}</span></div><span className="text-sm text-gray-700 truncate">{req.assignee.name}</span></div>
                  ) : <span className="text-sm text-gray-300">미지정</span>}
                </div>
                <div className="col-span-2">
                  {req.dueDate ? (
                    <div className="flex items-center gap-1.5">
                      {overdueFlag && <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>}
                      <span className={`text-sm font-medium ${overdueFlag ? "text-red-600" : "text-gray-700"}`}>{formatDueDate(req.dueDate)}</span>
                    </div>
                  ) : <span className="text-sm text-gray-300">-</span>}
                </div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}</p>
                  <p className="text-xs text-gray-300 mt-0.5 truncate">{req.createdBy.name}</p>
                </div>
              </div>
            );
          })}
        </div>
        {totalCount > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-gray-400 shrink-0">전체 <span className="font-semibold text-gray-600">{totalCount}</span>건 중 <span className="font-semibold text-gray-600">{startItem}–{endItem}</span>번{someSelected && <span className="ml-2 text-indigo-600 font-semibold">· {selected.size}건 선택</span>}</p>
            <div className="flex items-center gap-1">
              {page > 1 ? <Link href={pageUrl(page - 1)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>이전</Link> : <span className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-300 border border-gray-100 rounded-lg cursor-not-allowed"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>이전</span>}
              {pageNumbers.map((p, idx) => p === "..." ? <span key={`e-${idx}`} className="px-2 py-1.5 text-xs text-gray-400">…</span> : <Link key={p} href={pageUrl(p as number)} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${p === page ? "bg-indigo-600 text-white font-semibold" : "text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>{p}</Link>)}
              {page < totalPages ? <Link href={pageUrl(page + 1)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">다음<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></Link> : <span className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-300 border border-gray-100 rounded-lg cursor-not-allowed">다음<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
