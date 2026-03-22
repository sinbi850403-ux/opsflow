"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TYPE_LABELS, PRIORITY_LABELS, SOURCE_LABELS } from "@/types";

interface FormValues { title: string; description: string; type: string; priority: string; requesterName: string; requesterContact: string; source: string; dueDate: string; assigneeId: string; }
interface FormErrors { title?: string; type?: string; priority?: string; }
interface User { id: string; name: string; }
interface Props { users: User[]; }

const EMPTY_FORM: FormValues = { title: "", description: "", type: "", priority: "", requesterName: "", requesterContact: "", source: "", dueDate: "", assigneeId: "" };

function fieldCls(hasError: boolean): string {
  const base = "w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 bg-white text-gray-800 transition-shadow";
  return hasError ? `${base} border-red-300 focus:ring-red-400 focus:border-transparent` : `${base} border-gray-200 focus:ring-indigo-500 focus:border-transparent`;
}
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.title.trim()) errors.title    = "제목을 입력해주세요.";
  if (!values.type)          errors.type     = "요청 유형을 선택해주세요.";
  if (!values.priority)      errors.priority = "우선순위를 선택해주세요.";
  return errors;
}
function hasErrors(errors: FormErrors): boolean { return Object.keys(errors).length > 0; }

export function NewRequestForm({ users }: Props) {
  const router = useRouter();
  const [values,      setValues]      = useState<FormValues>(EMPTY_FORM);
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      const updated = { ...values, [name]: value };
      const next = validate(updated);
      setErrors((prev) => ({ ...prev, [name]: next[name as keyof FormErrors] }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const clientErrors = validate(values);
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors);
      const firstKey = Object.keys(clientErrors)[0];
      document.querySelector(`[name="${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: values.title.trim(), type: values.type, priority: values.priority, description: values.description.trim() || null, requesterName: values.requesterName.trim() || null, requesterContact: values.requesterContact.trim() || null, source: values.source || null, dueDate: values.dueDate || null, assigneeId: values.assigneeId || null }),
      });
      const data = await res.json();
      if (!res.ok) setServerError(data.error ?? "요청 등록 중 오류가 발생했습니다.");
      else         router.push(`/requests/${data.id}`);
    } catch { setServerError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요."); }
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {serverError && (
        <div className="flex items-start gap-3 mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm text-red-700 font-medium flex-1">{serverError}</p>
          <button onClick={() => setServerError(null)} className="text-red-400 hover:text-red-600 shrink-0"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">기본 정보</h2>
          <div>
            <label className={labelCls}>제목 <span className="text-red-400">*</span></label>
            <input type="text" name="title" value={values.title} onChange={handleChange} placeholder="요청 제목을 입력하세요" className={fieldCls(!!errors.title)} autoFocus />
            {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>유형 <span className="text-red-400">*</span></label>
              <select name="type" value={values.type} onChange={handleChange} className={fieldCls(!!errors.type)}>
                <option value="">유형 선택</option>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {errors.type && <p className="mt-1.5 text-xs text-red-500">{errors.type}</p>}
            </div>
            <div>
              <label className={labelCls}>우선순위 <span className="text-red-400">*</span></label>
              <select name="priority" value={values.priority} onChange={handleChange} className={fieldCls(!!errors.priority)}>
                <option value="">우선순위 선택</option>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {errors.priority && <p className="mt-1.5 text-xs text-red-500">{errors.priority}</p>}
            </div>
          </div>
          <div>
            <label className={labelCls}>설명</label>
            <textarea name="description" value={values.description} onChange={handleChange} rows={4} placeholder="요청 내용을 상세히 입력하세요 (선택)" className={`${fieldCls(false)} resize-none`} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">요청자 정보 <span className="text-gray-300 font-normal normal-case ml-1">(선택)</span></h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>이름</label><input type="text" name="requesterName" value={values.requesterName} onChange={handleChange} placeholder="예: 홍길동" className={fieldCls(false)} /></div>
            <div><label className={labelCls}>연락처</label><input type="text" name="requesterContact" value={values.requesterContact} onChange={handleChange} placeholder="전화번호, 이메일 등" className={fieldCls(false)} /></div>
          </div>
          <div>
            <label className={labelCls}>접수 경로</label>
            <select name="source" value={values.source} onChange={handleChange} className={fieldCls(false)}>
              <option value="">선택 안 함</option>
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">처리 정보 <span className="text-gray-300 font-normal normal-case ml-1">(선택)</span></h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>담당자</label>
              <select name="assigneeId" value={values.assigneeId} onChange={handleChange} className={fieldCls(false)}>
                <option value="">미지정</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>마감일</label><input type="date" name="dueDate" value={values.dueDate} onChange={handleChange} className={fieldCls(false)} /></div>
          </div>
        </div>
        <div className="flex items-center gap-3 pb-2">
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{loading ? "등록 중..." : "요청 등록"}</button>
          <button type="button" onClick={() => { setValues(EMPTY_FORM); setErrors({}); setServerError(null); }} disabled={loading} className="px-5 py-2.5 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">초기화</button>
          {hasErrors(errors) && <p className="text-xs text-red-500 ml-1">필수 항목을 확인해주세요.</p>}
        </div>
      </form>
    </div>
  );
}
