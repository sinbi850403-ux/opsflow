"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteHistoryButtonProps = {
  id: string;
  fileName: string;
};

export default function DeleteHistoryButton({
  id,
  fileName,
}: DeleteHistoryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(`"${fileName}" 업로드 이력을 삭제할까요?`);

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/light/history/${id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "업로드 이력 삭제 중 오류가 발생했습니다."
        );
      }

      router.push("/light/history");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "업로드 이력 삭제 중 오류가 발생했습니다.";

      window.alert(message);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "48px",
        padding: "0 18px",
        borderRadius: "14px",
        border: "none",
        background: loading ? "#fca5a5" : "#dc2626",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "삭제 중..." : "이 기록 삭제"}
    </button>
  );
}
