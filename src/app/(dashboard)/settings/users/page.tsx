import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { UserManagement } from "./UserManagement";

async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export default async function UsersSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/dashboard");
  const users = await getUsers();
  return (
    <div className="flex flex-col">
      <Header title="사용자 관리" />
      <main className="flex-1 p-6"><UserManagement users={users} /></main>
    </div>
  );
}
