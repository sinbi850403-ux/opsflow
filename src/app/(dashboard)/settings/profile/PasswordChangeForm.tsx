"use client";
import { useState } from "react";

interface FormState { currentPassword: string; newPassword: string; confirmPassword: string; }
const EMPTY_FORM: FormState = { currentPassword: "", newPassword: "", confirmPassword: "" };
const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-800 transition-shadow";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

export function PasswordChangeForm() {
  const [form,    setForm]    = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const confirmMismatch = form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error)   setError(null);
    if (success) setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(false);
    if (!form.currentPassword)       { setError("현재 비밀번호를 입력해주세요."); return; }
    if (!form.newPassword)           { setError("새 비밀번호를 입력해주세요."); return; }
    if (form.newPassword.length < 8) { setError("새 비밀번호는 8자 이상이어야 합니다."); return; }
    if (form.newPassword !== form.confirmPassword) { setError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword, confirmPassword: form.confirmPassword }) });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "비밀번호 변경 중 오류가 발생했습니다.");
      else { setSuccess(true); setForm(EMPTY_FORM); }
    } catch { setError("네트워크 오류가 발생했습니다."); }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">비밀번호 변경</h2>
        <p className="text-xs text-gray-400 mt-0.5">새 비밀번호는 8자 이상이어야 하며 현재 비밀번호와 달라야 합니다.</p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div><label className={labelCls}>현재 비밀번호</label><input type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} autoComplete="current-password" className={inputCls} /></div>
        <div className="border-t border-gray-100" />
        <div>
          <label className={labelCls}>새 비밀번호</label>
          <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} autoComplete="new-password" className={inputCls} />
          {form.newPassword.length > 0 && form.newPassword.length < 8 && <p className="text-xs text-amber-500 mt-1">8자 이상 입력해주세요. (현재 {form.newPassword.length}자)</p>}
        </div>
        <div>
          <label className={labelCls}>새 비밀번호 확인</label>
          <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password"
            className={`${inputCls} ${confirmMismatch ? "border-red-300 focus:ring-red-400" : form.confirmPassword.length > 0 && form.newPassword === form.confirmPassword ? "border-green-300 focus:ring-green-400" : ""}`} />
          {confirmMismatch && <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>}
          {!confirmMismatch && form.confirmPassword.length > 0 && form.newPassword === form.confirmPassword && <p className="text-xs text-green-500 mt-1">비밀번호가 일치합니다.</p>}
        </div>
        {error && (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-sm text-red-600 leading-relaxed">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-lg">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <p className="text-sm text-green-700 font-medium">비밀번호가 성공적으로 변경되었습니다.</p>
          </div>
        )}
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={loading || confirmMismatch} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{loading ? "변경 중..." : "비밀번호 변경"}</button>
          <button type="button" onClick={() => { setForm(EMPTY_FORM); setError(null); setSuccess(false); }} disabled={loading} className="px-5 py-2.5 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">초기화</button>
        </div>
      </form>
    </div>
  );
}
