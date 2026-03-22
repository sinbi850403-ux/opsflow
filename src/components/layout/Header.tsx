import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface HeaderProps {
  title: string;
}

export async function Header({ title }: HeaderProps) {
  const session = await getServerSession(authOptions);

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {session?.user && (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-indigo-600">
              {session.user.name?.[0] ?? "?"}
            </span>
          </div>
          <span className="text-sm text-gray-600">{session.user.name}</span>
        </div>
      )}
    </header>
  );
}
