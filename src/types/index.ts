export const VALID_STATUSES = [
  "new", "reviewing", "in_progress", "waiting_external", "done", "on_hold",
] as const;

export const VALID_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const VALID_TYPES = [
  "cs", "order", "purchase", "delivery", "refund", "internal", "other",
] as const;

export type RequestStatus   = typeof VALID_STATUSES[number];
export type RequestPriority = typeof VALID_PRIORITIES[number];
export type RequestType     = typeof VALID_TYPES[number];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new:              "신규",
  reviewing:        "검토중",
  in_progress:      "진행중",
  waiting_external: "외부대기",
  done:             "완료",
  on_hold:          "보류",
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low:    "낮음",
  medium: "보통",
  high:   "높음",
  urgent: "긴급",
};

export const TYPE_LABELS: Record<RequestType, string> = {
  cs:       "CS",
  order:    "주문",
  purchase: "발주",
  delivery: "배송",
  refund:   "환불",
  internal: "사내",
  other:    "기타",
};

export const SOURCE_LABELS: Record<string, string> = {
  phone:    "전화",
  email:    "이메일",
  kakao:    "카카오",
  internal: "사내",
  other:    "기타",
};

export interface RequestWithRelations {
  id:               string;
  title:            string;
  description:      string | null;
  type:             string;
  status:           string;
  priority:         string;
  requesterName:    string | null;
  requesterContact: string | null;
  source:           string | null;
  dueDate:          Date | null;
  assigneeId:       string | null;
  assignee:         { id: string; name: string; email: string } | null;
  createdBy:        { id: string; name: string; email: string };
  createdAt:        Date;
  updatedAt:        Date;
  memos: {
    id:        string;
    content:   string;
    createdAt: Date;
    author:    { id: string; name: string };
  }[];
  activities: {
    id:        string;
    type:      string;
    message:   string;
    createdAt: Date;
    user:      { id: string; name: string };
  }[];
}
