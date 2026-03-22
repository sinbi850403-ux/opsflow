"use client";

import { useState } from "react";

interface InlineFieldProps {
  displayValue: React.ReactNode;
  isEmpty?: boolean;
  emptyText?: string;
  editValue: string;
  onSave: (value: string) => Promise<boolean>;
  renderInput: (value: string, onChange: (v: string) => void) => React.ReactNode;
  validate?: (value: string) => string | null;
}

export function InlineField({
  displayValue, isEmpty = false, emptyText = "클릭하여 편집",
  editValue, onSave, renderInput, validate,
}: InlineFieldProps) {
  const [editing,  setEditing]  = useState(false);
  const [value,    setValue]    = useState(editValue);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  function handleStartEdit() {
    setValue(editValue);
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (validate) {
      const err = validate(value);
      if (err) { setError(err); return; }
    }
    setSaving(true);
    const ok = await onSave(value);
    setSaving(false);
    if (ok) setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
    setError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") handleCancel();
  }

  if (!editing) {
    return (
      <div
        onClick={handleStartEdit}
        className="cursor-pointer rounded-lg px-1 -mx-1 hover:bg-indigo-50 hover:ring-1 hover:ring-indigo-200 transition-all"
      >
        {isEmpty ? (
          <span className="text-gray-300 italic text-sm">{emptyText}</span>
        ) : (
          displayValue
        )}
      </div>
    );
  }

  return (
    <div onKeyDown={handleKeyDown}>
      {renderInput(value, setValue)}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-3 py-1 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}
