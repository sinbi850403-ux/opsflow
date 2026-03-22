import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { NewRequestForm } from "./NewRequestForm";

async function getUsers() {
  return prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export default async function NewRequestPage() {
  const users = await getUsers();
  return (
    <div className="flex flex-col">
      <Header title="새 요청 등록" />
      <main className="flex-1 p-6"><NewRequestForm users={users} /></main>
    </div>
  );
}
