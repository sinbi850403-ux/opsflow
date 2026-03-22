import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { PasswordChangeForm } from "./PasswordChangeForm";

export default async function ProfileSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = { name: session.user.name ?? "", email: session.user.email ?? "", role: session.user.role };

  return (
    <div className="flex flex-col">
      <Header title="내 계정" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">계정 정보</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-indigo-600">{user.name[0]}</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${user.role === "admin" ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200" : "bg-gray-100 text-gray-600"}`}>
                  {user.role === "admin" ? "관리자" : "멤버"}
                </span>
              </div>
            </div>
          </div>
          <PasswordChangeForm />
        </div>
      </main>
    </div>
  );
}
