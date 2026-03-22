import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysLater(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function main() {
  await prisma.activity.deleteMany();
  await prisma.memo.deleteMany();
  await prisma.request.deleteMany();
  await prisma.user.deleteMany();

  const adminPw  = await bcrypt.hash("password123", 10);
  const memberPw = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: { name: "관리자", email: "admin@opsflow.com", password: adminPw, role: "admin" },
  });

  const member = await prisma.user.create({
    data: { name: "김담당", email: "member@opsflow.com", password: memberPw, role: "member" },
  });

  const requests = [
    {
      title: "신규 고객 CS 문의 처리",
      description: "고객이 주문 상품이 배송되지 않았다고 문의함",
      type: "cs" as const,
      status: "new" as const,
      priority: "high" as const,
      requesterName: "홍길동",
      requesterContact: "010-1234-5678",
      source: "phone",
      dueDate: daysLater(3),
      createdById: admin.id,
      assigneeId: member.id,
    },
    {
      title: "상품 재고 발주 요청",
      description: "인기 상품 재고가 5개 미만으로 떨어짐. 100개 발주 요청",
      type: "purchase" as const,
      status: "in_progress" as const,
      priority: "medium" as const,
      requesterName: "이재고",
      requesterContact: "inventory@company.com",
      source: "email",
      dueDate: daysLater(7),
      createdById: admin.id,
      assigneeId: admin.id,
    },
    {
      title: "환불 처리 요청 — 주문번호 ORD-20240315",
      description: "고객 변심으로 인한 환불 요청. 결제 후 3일 이내이므로 처리 가능",
      type: "refund" as const,
      status: "reviewing" as const,
      priority: "urgent" as const,
      requesterName: "박환불",
      requesterContact: "park@email.com",
      source: "email",
      dueDate: daysLater(1),
      createdById: member.id,
      assigneeId: member.id,
    },
    {
      title: "배송 지연 건 처리",
      description: "택배사 파업으로 인해 3건 배송 지연 중",
      type: "delivery" as const,
      status: "waiting_external" as const,
      priority: "high" as const,
      dueDate: daysAgo(1),
      createdById: member.id,
      assigneeId: null,
    },
    {
      title: "사내 인트라넷 접속 오류",
      description: "팀원 중 2명이 인트라넷 접속 불가 상황 발생",
      type: "internal" as const,
      status: "done" as const,
      priority: "medium" as const,
      dueDate: daysAgo(2),
      createdById: admin.id,
      assigneeId: admin.id,
    },
    {
      title: "VIP 고객 주문 취소 처리",
      description: "VIP 등급 고객의 주문 취소 요청. 빠른 처리 필요",
      type: "order" as const,
      status: "new" as const,
      priority: "urgent" as const,
      requesterName: "최VIP",
      requesterContact: "vip@customer.com",
      source: "kakao",
      dueDate: daysAgo(3),
      createdById: member.id,
      assigneeId: null,
    },
  ];

  for (const req of requests) {
    const created = await prisma.request.create({ data: req });
    await prisma.activity.create({
      data: {
        type: "created",
        message: "요청이 생성되었습니다.",
        requestId: created.id,
        userId: req.createdById,
      },
    });
  }

  console.log("✅ Seed 완료");
  console.log("   admin@opsflow.com / password123");
  console.log("   member@opsflow.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
