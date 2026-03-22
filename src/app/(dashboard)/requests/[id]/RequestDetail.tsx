"use client";
import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge, PriorityBadge, TypeBadge } from "@/components/ui/Badge";
import { InlineField } from "@/components/ui/InlineField";
import { isOverdue, toDateInputValue } from "@/lib/date";
import { RequestWithRelations, STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, SOURCE_LABELS } from "@/types";

interface Props { request: RequestWithRelations; users: { id: string; name: string }[]; currentUserId: string; currentUserRole: string; }

function ActivityIcon({ type }: { type: string }) {
  const base = "w-6 h-6 rounded-full flex items-center justify-center shrink-0";
  const map: Record<string, { bg: string; d: string }> = {
    created:           { bg: "bg-indigo-100",  d: "M12 4v16m8-8H4" },
    status_changed:    { bg: "bg-amber-100",   d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
    priority_changed:  { bg: "bg-orange-100",  d: "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" },
    type_changed:      { bg: "bg-purple-100",  d: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" },
    assignee_changed:  { bg: "bg-blue-100",    d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    memo_added:        { bg: "bg-green-100",   d: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
    memo_deleted:      { bg: "bg-rose-100",    d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
    duedate_changed:   { bg: "bg-sky-100",     d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    requester_changed: { bg: "bg-teal-100",    d: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" },
    source_changed:    { bg: "bg-rose-100",    d: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  };
  const colorMap: Record<string, string> = { "bg-indigo-100":"text-indigo-600","bg-amber-100":"text-amber-600","bg-orange-100":"text-orange-600","bg-purple-100":"text-purple-600","bg-blue-100":"text-blue-600","bg-green-100":"text-green-600","bg-sky-100":"text-sky-600","bg-teal-100":"text-teal-600","bg-rose-100":"text-rose-600" };
  const item = map[type];
  if (!item) return <div className={`${base} bg-gray-100`}><svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
  return <div className={`${base} ${item.bg}`}><svg className={`w-3 h-3 ${colorMap[item.bg] ?? "text-gray-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.d} /></svg></div>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between items-center"><span className="text-gray-400">{label}</span><span className="text-gray-700 font-medium text-right">{value}</span></div>;
}

const inputCls        = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";
const compactInputCls = "w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";
const selectCls       = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700 transition-shadow";

function DeleteConfirmPanel({ title, onConfirm, onCancel, loading }: { title: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-700">요청을 삭제하시겠습니까?</p>
          <p className="text-xs text-red-600 mt-0.5 leading-relaxed"><span className="font-medium">"{title}"</span> 요청과 모든 메모, 활동 이력이 영구 삭제됩니다.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onConfirm} disabled={loading} className="flex-1 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{loading ? "삭제 중..." : "삭제 확인"}</button>
        <button onClick={onCancel}  disabled={loading} className="flex-1 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">취소</button>
      </div>
    </div>
  );
}

function MemoDeleteConfirm({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="mt-2 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-xs text-red-600 flex-1">이 메모를 삭제하시겠습니까?</p>
      <button onClick={onConfirm} disabled={loading} className="px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0">{loading ? "삭제 중..." : "삭제"}</button>
      <button onClick={onCancel}  disabled={loading} className="px-2.5 py-1 border border-red-200 text-red-500 text-xs font-medium rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors shrink-0">취소</button>
    </div>
  );
}

export function RequestDetail({ request, users, currentUserId, currentUserRole }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [memoContent,       setMemoContent]      = useState("");
  const [memoLoading,       setMemoLoading]       = useState(false);
  const [actionLoading,     setActionLoading]     = useState<string | null>(null);
  const [patchError,        setPatchError]        = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading,     setDeleteLoading]     = useState(false);
  const [memoConfirmId,     setMemoConfirmId]     = useState<string | null>(null);
  const [memoDeletingId,    setMemoDeletingId]    = useState<string | null>(null);
  const [memoError,         setMemoError]         = useState<string | null>(null);

  const overdueFlag = isOverdue(request.dueDate, request.status);
  const isAdmin     = currentUserRole === "admin";
  function canDeleteMemo(authorId: string) { return currentUserId === authorId || isAdmin; }

  const showError = useCallback((msg: string) => { setPatchError(msg); setTimeout(() => setPatchError(null), 3000); }, []);

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch(`/api/requests/${request.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); showError(data?.error ?? "수정 중 오류가 발생했습니다."); return false; }
      startTransition(() => router.refresh()); return true;
    } catch { showError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요."); return false; }
  }

  async function handleDeleteRequest() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/requests/${request.id}`, { method: "DELETE" });
      if (res.ok) router.push("/requests");
      else { const data = await res.json().catch(() => ({})); showError(data?.error ?? "요청 삭제 중 오류가 발생했습니다."); setShowDeleteConfirm(false); }
    } catch { showError("네트워크 오류가 발생했습니다."); setShowDeleteConfirm(false); }
    setDeleteLoading(false);
  }

  async function handleDeleteMemo(memoId: string) {
    setMemoDeletingId(memoId); setMemoError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/memos/${memoId}`, { method: "DELETE" });
      if (res.ok) { setMemoConfirmId(null); startTransition(() => router.refresh()); }
      else { const data = await res.json().catch(() => ({})); setMemoError(data?.error ?? "메모 삭제 중 오류가 발생했습니다."); setMemoConfirmId(null); }
    } catch { setMemoError("네트워크 오류가 발생했습니다."); setMemoConfirmId(null); }
    setMemoDeletingId(null);
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>)   { setActionLoading("status");   await patch({ status:     e.target.value }); setActionLoading(null); }
  async function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) { setActionLoading("priority"); await patch({ priority:   e.target.value }); setActionLoading(null); }
  async function handleAssigneeChange(e: React.ChangeEvent<HTMLSelectElement>) { setActionLoading("assignee"); await patch({ assigneeId: e.target.value || null }); setActionLoading(null); }

  async function handleMemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memoContent.trim()) return;
    setMemoLoading(true);
    try {
      const res = await fetch(`/api/requests/${request.id}/memos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: memoContent }) });
      if (res.ok) { setMemoContent(""); startTransition(() => router.refresh()); }
      else { const data = await res.json().catch(() => ({})); showError(data?.error ?? "메모 저장 중 오류가 발생했습니다."); }
    } catch { showError("네트워크 오류가 발생했습니다."); }
    setMemoLoading(false);
  }

  function formatDate(val: Date | string | null): string { if (!val) return "-"; return new Date(val).toLocaleDateString("ko-KR"); }
  function formatDateTime(val: Date | string): string { return new Date(val).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }

  return (
    <main className="flex-1 p-6">
      {patchError && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm text-red-700 font-medium flex-1">{patchError}</p>
          <button onClick={() => setPatchError(null)} className="text-red-400 hover:text-red-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}
      <div className="mb-5">
        <Link href="/requests" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>요청 목록</Link>
        {overdueFlag && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-4">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            <p className="text-sm text-red-700 font-medium">마감일({formatDate(request.dueDate)})이 지난 요청입니다. 조치가 필요합니다.</p>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <InlineField displayValue={<span className="text-xl font-bold text-gray-900">{request.title}</span>} isEmpty={!request.title} emptyText="제목 없음" editValue={request.title} onSave={(val) => patch({ title: val })} validate={(val) => (val ? null : "제목은 필수입니다.")} renderInput={(val, onChange) => <input value={val} onChange={(e) => onChange(e.target.value)} autoFocus className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />} />
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-1"><TypeBadge type={request.type} /><StatusBadge status={request.status} /><PriorityBadge priority={request.priority} /></div>
        </div>
        <p className="text-xs text-gray-300 mt-1.5 ml-1">제목·내용·마감일·요청자 정보를 클릭하면 편집할 수 있습니다.</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* 좌측 */}
        <div className="flex-1 space-y-5 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">요청 내용</h3>
            <InlineField displayValue={<p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{request.description}</p>} isEmpty={!request.description} emptyText="내용 없음 — 클릭하여 추가" editValue={request.description ?? ""} onSave={(val) => patch({ description: val || null })} renderInput={(val, onChange) => <textarea value={val} onChange={(e) => onChange(e.target.value)} rows={5} autoFocus className={`${inputCls} resize-none`} placeholder="요청 내용을 입력하세요" />} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">메모</h3>
            {memoError && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-red-600 flex-1">{memoError}</p>
                <button onClick={() => setMemoError(null)} className="text-red-400 hover:text-red-600"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            )}
            <form onSubmit={handleMemoSubmit} className="mb-5">
              <textarea value={memoContent} onChange={(e) => setMemoContent(e.target.value)} rows={3} placeholder="메모를 입력하세요..." className={`${inputCls} resize-none`} />
              <div className="flex justify-end mt-2">
                <button type="submit" disabled={memoLoading || !memoContent.trim()} className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{memoLoading ? "저장 중..." : "메모 추가"}</button>
              </div>
            </form>
            {request.memos.length === 0 ? <p className="text-sm text-gray-300 text-center py-4">등록된 메모가 없습니다.</p> : (
              <div className="space-y-4">
                {request.memos.map((memo) => {
                  const canDelete    = canDeleteMemo(memo.author.id);
                  const isConfirming = memoConfirmId  === memo.id;
                  const isDeleting   = memoDeletingId === memo.id;
                  return (
                    <div key={memo.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5"><span className="text-xs font-semibold text-slate-600">{memo.author.name[0]}</span></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700">{memo.author.name}</span>
                          <span className="text-xs text-gray-400">{formatDateTime(memo.createdAt)}</span>
                          {canDelete && !isConfirming && (
                            <button onClick={() => setMemoConfirmId(memo.id)} disabled={isDeleting} className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>삭제
                            </button>
                          )}
                        </div>
                        <p className={`text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5 ${isDeleting ? "opacity-50" : ""}`}>{memo.content}</p>
                        {isConfirming && <MemoDeleteConfirm onConfirm={() => handleDeleteMemo(memo.id)} onCancel={() => setMemoConfirmId(null)} loading={isDeleting} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 우측 */}
        <div className="w-72 space-y-4 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">관리</h3>
            <div><label className="block text-xs font-medium text-gray-500 mb-1.5">상태</label><select value={request.status}     onChange={handleStatusChange}   disabled={actionLoading === "status"}   className={selectCls}>{Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1.5">우선순위</label><select value={request.priority}   onChange={handlePriorityChange} disabled={actionLoading === "priority"} className={selectCls}>{Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1.5">담당자</label><select value={request.assigneeId ?? ""} onChange={handleAssigneeChange} disabled={actionLoading === "assignee"} className={selectCls}><option value="">미지정</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div className="border-t border-gray-100 pt-4">
              {showDeleteConfirm ? <DeleteConfirmPanel title={request.title} onConfirm={handleDeleteRequest} onCancel={() => setShowDeleteConfirm(false)} loading={deleteLoading} /> : (
                <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>요청 삭제
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">요청 정보</h3>
            <div className="space-y-2.5 text-xs">
              <InfoRow label="유형"   value={TYPE_LABELS[request.type as keyof typeof TYPE_LABELS] ?? request.type} />
              <InfoRow label="등록자" value={request.createdBy.name} />
              <InfoRow label="등록일" value={formatDate(request.createdAt)} />
              <InfoRow label="최종수정" value={formatDate(request.updatedAt)} />
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 mb-1.5">마감일</p>
              <InlineField displayValue={<span className={`text-xs font-medium ${overdueFlag ? "text-red-600 font-semibold" : "text-gray-700"}`}>{formatDate(request.dueDate)}{overdueFlag && " ⚠️"}</span>} isEmpty={!request.dueDate} emptyText="없음 — 클릭하여 설정" editValue={toDateInputValue(request.dueDate)} onSave={(val) => patch({ dueDate: val || null })} renderInput={(val, onChange) => <input type="date" value={val} onChange={(e) => onChange(e.target.value)} autoFocus className={compactInputCls} />} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">요청자 정보</h3>
            <div>
              <p className="text-xs text-gray-400 mb-1">이름</p>
              <InlineField displayValue={<span className="text-xs font-medium text-gray-700">{request.requesterName}</span>} isEmpty={!request.requesterName} emptyText="미입력" editValue={request.requesterName ?? ""} onSave={(val) => patch({ requesterName: val || null })} renderInput={(val, onChange) => <input value={val} onChange={(e) => onChange(e.target.value)} autoFocus placeholder="예: 김민수" className={compactInputCls} />} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">연락처</p>
              <InlineField displayValue={<span className="text-xs font-medium text-gray-700">{request.requesterContact}</span>} isEmpty={!request.requesterContact} emptyText="미입력" editValue={request.requesterContact ?? ""} onSave={(val) => patch({ requesterContact: val || null })} renderInput={(val, onChange) => <input value={val} onChange={(e) => onChange(e.target.value)} autoFocus placeholder="전화번호 또는 이메일" className={compactInputCls} />} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">접수 경로</p>
              <InlineField displayValue={<span className="text-xs font-medium text-gray-700">{SOURCE_LABELS[request.source ?? ""] ?? request.source}</span>} isEmpty={!request.source} emptyText="미입력" editValue={request.source ?? ""} onSave={(val) => patch({ source: val || null })} renderInput={(val, onChange) => <select value={val} onChange={(e) => onChange(e.target.value)} className={compactInputCls}><option value="">미입력</option>{Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">활동 이력</h3>
            {request.activities.length === 0 ? <p className="text-xs text-gray-300 text-center py-2">활동 이력이 없습니다.</p> : (
              <div className="space-y-3">
                {request.activities.map((activity) => (
                  <div key={activity.id} className="flex gap-2.5 items-start">
                    <ActivityIcon type={activity.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 leading-relaxed">{activity.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{activity.user.name} · {formatDateTime(activity.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
