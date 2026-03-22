"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface User { id: string; name: string; email: string; role: string; createdAt: Date; }
interface Props { users: User[]; }
const ROLE_LABELS: Record<string, string> = { admin: "관리자", member: "멤버" };
const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-800 transition-shadow";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
interface FormState { name: string; email: string; password: string; role: string; }
const EMPTY_FORM: FormState = { name: "", email: "", password: "", role: "member" };

export function UserManagement({ users }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) { setForm((prev) => ({ ...prev, [e.target.name]: e.target.value })); }
  function resetFields() { setForm(EMPTY_FORM); setError(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!form.name.trim())        { setError("이름을 입력해주세요."); return; }
    if (!form.email.trim())       { setError("이메일을 입력해주세요."); return; }
    if (form.password.length < 8) { setError("비밀번호는 8자 이상이어야 합니다."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, role: form.role }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "사용자 생성 중 오류가 발생했습니다."); }
      else { setSuccess(`"${data.name}" 계정이 생성되었습니다.`); resetFields(); setShowForm(false); startTransition(() => router.refresh()); }
    } catch { setError("네트워크 오류가 발생했습니다."); }
    setLoading(false);
  }

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div><h2 className="text-sm font-semibold text-gray-900">팀원 목록</h2><p className="text-xs text-gray-400 mt-0.5">현재 {users.length}명 등록됨</p></div>
            <button onClick={() => { resetFields(); setSuccess(null); setShowForm((p) => !p); }} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${showForm ? "border border-gray-200 text-gray-500 hover:bg-gray-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>{showForm ? "취소" : "+ 새 팀원"}</button>
          </div>
          {success && (
            <div className="flex items-center gap-2.5 px-6 py-3 bg-green-50 border-b border-green-100">
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <p className="text-sm text-green-700 font-medium">{success}</p>
              <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          )}
          <div className="grid grid-cols-12 gap-4 px-6 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <div className="col-span-3">이름</div><div className="col-span-4">이메일</div><div className="col-span-2">역할</div><div className="col-span-3">가입일</div>
          </div>
          <div className="divide-y divide-gray-50">
            {users.length === 0 && <p className="text-sm text-gray-400 text-center py-12">등록된 사용자가 없습니다.</p>}
            {users.map((user) => (
              <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0"><span className="text-xs font-semibold text-indigo-600">{user.name[0]}</span></div>
                  <span className="text-sm font-medium text-gray-800 truncate">{user.name}</span>
                </div>
                <div className="col-span-4 min-w-0"><span className="text-sm text-gray-500 truncate block">{user.email}</span></div>
                <div className="col-span-2"><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${user.role === "admin" ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200" : "bg-gray-100 text-gray-600"}`}>{ROLE_LABELS[user.role] ?? user.role}</span></div>
                <div className="col-span-3"><span className="text-sm text-gray-400">{new Date(user.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showForm && (
        <div className="w-80 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-900">새 팀원 추가</h3><p className="text-xs text-gray-400 mt-0.5">계정 생성 후 임시 비밀번호를 전달해주세요.</p></div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div><label className={labelCls}>이름</label><input name="name" value={form.name} onChange={handleChange} autoFocus placeholder="홍길동" className={inputCls} /></div>
              <div><label className={labelCls}>이메일</label><input type="email" name="email" value={form.email} onChange={handleChange} placeholder="hong@example.com" className={inputCls} /></div>
              <div><label className={labelCls}>임시 비밀번호</label><input type="password" name="password" value={form.password} onChange={handleChange} placeholder="8자 이상" className={inputCls} /></div>
              <div><label className={labelCls}>역할</label><select name="role" value={form.role} onChange={handleChange} className={inputCls}><option value="member">멤버</option><option value="admin">관리자</option></select></div>
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{loading ? "생성 중..." : "계정 생성"}</button>
                <button type="button" onClick={() => { resetFields(); setShowForm(false); }} disabled={loading} className="px-4 py-2.5 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
