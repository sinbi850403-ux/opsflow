import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { RequestDetail } from "./RequestDetail";

interface PageProps {
  params: { id: string };
}

async function getRequest(id: string) {
  return prisma.request.findUnique({
    where: { id },
    include: {
      assignee:  { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      memos:      { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      activities: { include: { user:   { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
}

async function getUsers() {
  return prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export default async function RequestDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [request, users] = await Promise.all([getRequest(params.id), getUsers()]);
  if (!request) notFound();

  return (
    <div className="flex flex-col">
      <Header title="요청 상세" />
      <RequestDetail
        request={request}
        users={users}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
      />
    </div>
  );
}
