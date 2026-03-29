"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  LightPreviewResult,
  LightPreviewRow,
  NormalizedPreviewRow,
  StandardFieldKey,
  StandardFieldMapping,
} from "../../types/light";
import {
  STANDARD_FIELDS,
  buildInitialMapping,
  buildNormalizedRows,
  countMappedFields,
  createEmptyMapping,
  findDuplicateMappedHeaders,
} from "../../lib/light/field-mapping";

type ValidationFieldErrors = Partial<Record<StandardFieldKey, string>>;

type ValidationResult = {
  rowIndex: number;
  fieldErrors: ValidationFieldErrors;
  messages: string[];
  hasError: boolean;
};

type TableFilter = "all" | "valid" | "error";

type DisplayRow = {
  originalIndex: number;
  row: NormalizedPreviewRow;
  validation: ValidationResult;
};

type MappingTemplate = {
  id: string;
  name: string;
  mapping: StandardFieldMapping;
  createdAt: string;
  updatedAt: string;
};

type TemplateNoticeTone = "success" | "error" | "info";

function escapeCsvCell(value: unknown) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const escaped = text.replace(/"/g, '""');

  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

function buildNormalizedCsvText(rows: NormalizedPreviewRow[]) {
  const headers = STANDARD_FIELDS.map((field) => field.label);
  const lines = [
    headers.map((header) => escapeCsvCell(header)).join(","),
    ...rows.map((row) =>
      STANDARD_FIELDS.map((field) => escapeCsvCell(row[field.key])).join(",")
    ),
  ];

  return lines.join("\r\n");
}

function createNormalizedCsvFileName(
  fileName: string,
  sheetName: string,
  suffix: string
) {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const safeBaseName = baseName.replace(/[\\/:*?"<>|]/g, "-");
  const safeSheetName = sheetName.replace(/[\\/:*?"<>|]/g, "-");

  return `${safeBaseName}-${safeSheetName}-${suffix}.csv`;
}

function downloadTextFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], {
    type: contentType,
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

function downloadCsvFile(csvText: string, fileName: string) {
  downloadTextFile(`\uFEFF${csvText}`, fileName, "text/csv;charset=utf-8;");
}

function normalizeNumberText(value: string) {
  return value.replace(/[,\s₩￦원]/g, "").trim();
}

function tryNormalizeNumberValue(value: string) {
  const normalized = normalizeNumberText(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return String(parsed);
}

function parseExcelSerialDate(value: number) {
  const baseDate = Date.UTC(1899, 11, 30);
  return new Date(baseDate + value * 24 * 60 * 60 * 1000);
}

function isValidDateParts(year: number, month: number, day: number) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatDateToYmd(year: number, month: number, day: number) {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function formatDateObjectToYmd(date: Date) {
  return formatDateToYmd(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
}

function tryNormalizeDateValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^\d{4,5}$/.test(trimmed)) {
    const serial = Number(trimmed);

    if (Number.isFinite(serial) && serial > 0) {
      const parsedSerialDate = parseExcelSerialDate(serial);

      if (!Number.isNaN(parsedSerialDate.getTime())) {
        return formatDateObjectToYmd(parsedSerialDate);
      }
    }
  }

  if (/^\d{8}$/.test(trimmed)) {
    const year = Number(trimmed.slice(0, 4));
    const month = Number(trimmed.slice(4, 6));
    const day = Number(trimmed.slice(6, 8));

    if (isValidDateParts(year, month, day)) {
      return formatDateToYmd(year, month, day);
    }
  }

  const ymdMatch = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);

  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);

    if (isValidDateParts(year, month, day)) {
      return formatDateToYmd(year, month, day);
    }
  }

  const mdyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

  if (mdyMatch) {
    const month = Number(mdyMatch[1]);
    const day = Number(mdyMatch[2]);
    const rawYear = Number(mdyMatch[3]);
    const year = mdyMatch[3].length === 2 ? 2000 + rawYear : rawYear;

    if (isValidDateParts(year, month, day)) {
      return formatDateToYmd(year, month, day);
    }
  }

  const fallback = new Date(trimmed);

  if (!Number.isNaN(fallback.getTime())) {
    return formatDateObjectToYmd(fallback);
  }

  return null;
}

function buildDisplayRows(rows: NormalizedPreviewRow[]): NormalizedPreviewRow[] {
  return rows.map((row) => {
    const itemName = row.itemName.trim();
    const qty = row.qty.trim();
    const amount = row.amount.trim();
    const date = row.date.trim();

    return {
      itemName,
      qty: qty ? tryNormalizeNumberValue(qty) ?? qty : "",
      amount: amount ? tryNormalizeNumberValue(amount) ?? amount : "",
      date: date ? tryNormalizeDateValue(date) ?? date : "",
    };
  });
}

function buildValidationResults(rows: NormalizedPreviewRow[]): ValidationResult[] {
  return rows.map((row, rowIndex) => {
    const fieldErrors: ValidationFieldErrors = {};

    if (!row.itemName.trim()) {
      fieldErrors.itemName = "상품명 필수값 누락";
    }

    if (!row.qty.trim()) {
      fieldErrors.qty = "수량 필수값 누락";
    } else if (!tryNormalizeNumberValue(row.qty)) {
      fieldErrors.qty = "수량 숫자 형식 오류";
    }

    if (!row.amount.trim()) {
      fieldErrors.amount = "금액 필수값 누락";
    } else if (!tryNormalizeNumberValue(row.amount)) {
      fieldErrors.amount = "금액 숫자 형식 오류";
    }

    if (row.date.trim() && !tryNormalizeDateValue(row.date)) {
      fieldErrors.date = "거래일자 날짜 형식 오류";
    }

    const messages = Object.values(fieldErrors);
    const hasError = messages.length > 0;

    return {
      rowIndex,
      fieldErrors,
      messages,
      hasError,
    };
  });
}

function getValidationMessage(result: ValidationResult) {
  if (!result.hasError) {
    return "정상";
  }

  return result.messages.join(" / ");
}

function formatDateTimeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function sanitizeMapping(raw: unknown): StandardFieldMapping {
  const emptyMapping = createEmptyMapping();

  if (!raw || typeof raw !== "object") {
    return emptyMapping;
  }

  const source = raw as Record<string, unknown>;

  for (const key of Object.keys(emptyMapping) as StandardFieldKey[]) {
    emptyMapping[key] = typeof source[key] === "string" ? source[key] : "";
  }

  return emptyMapping;
}

function createTemplateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortTemplatesByUpdatedAt(templates: MappingTemplate[]) {
  return [...templates].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function parseTemplateArray(raw: unknown): MappingTemplate[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const templates: MappingTemplate[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const source = item as Record<string, unknown>;
    const id = typeof source.id === "string" ? source.id : createTemplateId();
    const name = typeof source.name === "string" ? source.name.trim() : "";
    const createdAt =
      typeof source.createdAt === "string"
        ? source.createdAt
        : new Date().toISOString();
    const updatedAt =
      typeof source.updatedAt === "string"
        ? source.updatedAt
        : new Date().toISOString();

    if (!name) {
      continue;
    }

    templates.push({
      id,
      name,
      createdAt,
      updatedAt,
      mapping: sanitizeMapping(source.mapping),
    });
  }

  return sortTemplatesByUpdatedAt(templates);
}

function buildTemplateApplicableMapping(
  templateMapping: StandardFieldMapping,
  availableHeaders: string[]
) {
  const nextMapping = createEmptyMapping();
  const headerSet = new Set(availableHeaders);
  const missingHeaders: string[] = [];

  for (const key of Object.keys(nextMapping) as StandardFieldKey[]) {
    const header = templateMapping[key];

    if (!header) {
      continue;
    }

    if (headerSet.has(header)) {
      nextMapping[key] = header;
    } else {
      missingHeaders.push(header);
    }
  }

  return {
    mapping: nextMapping,
    missingHeaders: Array.from(new Set(missingHeaders)),
  };
}

async function fetchMappingTemplatesFromApi() {
  const response = await fetch("/api/light/templates", {
    method: "GET",
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : "템플릿 목록을 불러오는 중 오류가 발생했습니다."
    );
  }

  return parseTemplateArray(data?.templates);
}

async function saveMappingTemplateToApi(
  name: string,
  mapping: StandardFieldMapping
) {
  const response = await fetch("/api/light/templates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mapping,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : "템플릿 저장 중 오류가 발생했습니다."
    );
  }

  const templates = parseTemplateArray([data?.template]);
  const template = templates[0];

  if (!template) {
    throw new Error("저장된 템플릿 정보를 읽을 수 없습니다.");
  }

  return {
    action: data?.action === "updated" ? "updated" : "created",
    template,
  } as const;
}

async function deleteMappingTemplateFromApi(id: string) {
  const response = await fetch(`/api/light/templates/${id}`, {
    method: "DELETE",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : "템플릿 삭제 중 오류가 발생했습니다."
    );
  }
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? "1px solid #111827" : "1px solid #d1d5db",
        background: active ? "#111827" : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        borderRadius: "999px",
        padding: "10px 14px",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function NoticeBox({
  tone,
  message,
}: {
  tone: TemplateNoticeTone;
  message: string;
}) {
  const styles =
    tone === "success"
      ? {
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          color: "#166534",
        }
      : tone === "error"
      ? {
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#b91c1c",
        }
      : {
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          color: "#1d4ed8",
        };

  return (
    <div
      style={{
        ...styles,
        borderRadius: "14px",
        padding: "14px 16px",
        fontSize: "14px",
        lineHeight: 1.6,
      }}
    >
      {message}
    </div>
  );
}

export default function LightPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [result, setResult] = useState<LightPreviewResult | null>(null);
  const [mapping, setMapping] = useState<StandardFieldMapping>(
    createEmptyMapping()
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");

  const [mappingTemplates, setMappingTemplates] = useState<MappingTemplate[]>(
    []
  );
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateNotice, setTemplateNotice] = useState("");
  const [templateNoticeTone, setTemplateNoticeTone] =
    useState<TemplateNoticeTone>("info");
  const [templateImportInputKey, setTemplateImportInputKey] = useState(0);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);

  const templateImportInputRef = useRef<HTMLInputElement | null>(null);

  async function requestPreview(file: File, sheetName?: string) {
    const formData = new FormData();
    formData.append("file", file);

    if (sheetName) {
      formData.append("sheetName", sheetName);
    }

    const response = await fetch("/api/light/preview", {
      method: "POST",
      body: formData,
    });

    const data: LightPreviewResult | { message?: string } =
      await response.json();

    if (!response.ok) {
      throw new Error(
        "message" in data
          ? data.message ?? "업로드 중 오류가 발생했습니다."
          : "업로드 중 오류가 발생했습니다."
      );
    }

    return data as LightPreviewResult;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadTemplates() {
      try {
        setTemplateLoading(true);
        const templates = await fetchMappingTemplatesFromApi();

        if (!isMounted) {
          return;
        }

        setMappingTemplates(templates);
        setSelectedTemplateId((prev) =>
          templates.some((template) => template.id === prev) ? prev : ""
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "템플릿 목록을 불러오는 중 오류가 발생했습니다.";

        setTemplateNoticeTone("error");
        setTemplateNotice(message);
      } finally {
        if (isMounted) {
          setTemplateLoading(false);
        }
      }
    }

    loadTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!result) {
      setMapping(createEmptyMapping());
      setTableFilter("all");
      return;
    }

    setMapping(buildInitialMapping(result.headers));
    setTableFilter("all");
  }, [result]);

  const normalizedRows = useMemo<NormalizedPreviewRow[]>(() => {
    if (!result) {
      return [];
    }

    return buildNormalizedRows(result.rows, mapping);
  }, [result, mapping]);

  const displayRows = useMemo(() => {
    return buildDisplayRows(normalizedRows);
  }, [normalizedRows]);

  const validationResults = useMemo(() => {
    return buildValidationResults(normalizedRows);
  }, [normalizedRows]);

  const displayRowBundles = useMemo<DisplayRow[]>(() => {
    return displayRows.map((row, index) => ({
      originalIndex: index,
      row,
      validation: validationResults[index],
    }));
  }, [displayRows, validationResults]);

  const filteredDisplayRows = useMemo(() => {
    if (tableFilter === "valid") {
      return displayRowBundles.filter((item) => !item.validation.hasError);
    }

    if (tableFilter === "error") {
      return displayRowBundles.filter((item) => item.validation.hasError);
    }

    return displayRowBundles;
  }, [displayRowBundles, tableFilter]);

  const validDisplayRows = useMemo(() => {
    return displayRowBundles
      .filter((item) => !item.validation.hasError)
      .map((item) => item.row);
  }, [displayRowBundles]);

  const errorDisplayRows = useMemo(() => {
    return displayRowBundles
      .filter((item) => item.validation.hasError)
      .map((item) => item.row);
  }, [displayRowBundles]);

  const errorRowCount = useMemo(() => {
    return validationResults.filter((item) => item.hasError).length;
  }, [validationResults]);

  const validRowCount = useMemo(() => {
    return validationResults.filter((item) => !item.hasError).length;
  }, [validationResults]);

  const mappedFieldCount = useMemo(() => {
    return countMappedFields(mapping);
  }, [mapping]);

  const duplicateMappedHeaders = useMemo(() => {
    return findDuplicateMappedHeaders(mapping);
  }, [mapping]);

  const requiredFieldCount = useMemo(() => {
    return STANDARD_FIELDS.filter((field) => field.required).length;
  }, []);

  const mappedRequiredFieldCount = useMemo(() => {
    return STANDARD_FIELDS.filter(
      (field) => field.required && Boolean(mapping[field.key])
    ).length;
  }, [mapping]);

  const missingRequiredFields = useMemo(() => {
    return STANDARD_FIELDS.filter(
      (field) => field.required && !mapping[field.key]
    );
  }, [mapping]);

  const errorTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const resultItem of validationResults) {
      for (const message of resultItem.messages) {
        counts[message] = (counts[message] ?? 0) + 1;
      }
    }

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [validationResults]);

  const currentMappingSummary = useMemo(() => {
    return STANDARD_FIELDS.map((field) => ({
      key: field.key,
      label: field.label,
      header: mapping[field.key],
    }));
  }, [mapping]);

  const templateSummaries = useMemo(() => {
    const headerSet = new Set(result?.headers ?? []);

    return mappingTemplates.map((template) => {
      let savedMappedCount = 0;
      let matchedCount = 0;
      let missingCount = 0;

      for (const key of Object.keys(template.mapping) as StandardFieldKey[]) {
        const header = template.mapping[key];

        if (!header) {
          continue;
        }

        savedMappedCount += 1;

        if (headerSet.has(header)) {
          matchedCount += 1;
        } else if (result) {
          missingCount += 1;
        }
      }

      return {
        ...template,
        savedMappedCount,
        matchedCount,
        missingCount,
      };
    });
  }, [mappingTemplates, result]);

  const canDownloadAllNormalizedCsv =
    displayRows.length > 0 && Boolean(result);
  const canDownloadValidNormalizedCsv =
    validDisplayRows.length > 0 && Boolean(result);
  const canDownloadErrorNormalizedCsv =
    errorDisplayRows.length > 0 && Boolean(result);
  const canSaveTemplate = mappedFieldCount > 0 && !templateSubmitting;

  function setTemplateNoticeMessage(
    tone: TemplateNoticeTone,
    message: string
  ) {
    setTemplateNoticeTone(tone);
    setTemplateNotice(message);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("파일을 먼저 선택해주세요.");
      setResult(null);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setResult(null);

    try {
      const previewResult = await requestPreview(selectedFile, selectedSheetName);
      setResult(previewResult);
      setSelectedSheetName(previewResult.sheetName);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.";

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSheetChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextSheetName = event.target.value;
    setSelectedSheetName(nextSheetName);

    if (!selectedFile) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const previewResult = await requestPreview(selectedFile, nextSheetName);
      setResult(previewResult);
      setSelectedSheetName(previewResult.sheetName);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "시트 변경 중 오류가 발생했습니다.";

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  function handleMappingChange(fieldKey: StandardFieldKey, header: string) {
    setMapping((prev) => ({
      ...prev,
      [fieldKey]: header,
    }));
  }

  function handleResetAutoMapping() {
    if (!result) {
      return;
    }

    setMapping(buildInitialMapping(result.headers));
    setTemplateNoticeMessage(
      "info",
      "현재 파일 헤더 기준으로 자동 매핑을 다시 적용했습니다."
    );
  }

  function handleClearMapping() {
    setMapping(createEmptyMapping());
    setTemplateNoticeMessage("info", "현재 매핑을 모두 비웠습니다.");
  }

  async function handleSaveMappingTemplate() {
    const trimmedName = templateName.trim();

    if (!trimmedName) {
      setTemplateNoticeMessage("error", "템플릿 이름을 입력해주세요.");
      return;
    }

    if (mappedFieldCount === 0) {
      setTemplateNoticeMessage("error", "저장할 매핑이 없습니다.");
      return;
    }

    try {
      setTemplateSubmitting(true);

      const { action, template } = await saveMappingTemplateToApi(
        trimmedName,
        mapping
      );

      setMappingTemplates((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== template.id);
        return sortTemplatesByUpdatedAt([template, ...withoutCurrent]);
      });

      setSelectedTemplateId(template.id);
      setTemplateName("");

      setTemplateNoticeMessage(
        "success",
        action === "updated"
          ? `"${trimmedName}" 템플릿을 덮어써서 저장했습니다.`
          : `"${trimmedName}" 템플릿을 저장했습니다.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "템플릿 저장 중 오류가 발생했습니다.";

      setTemplateNoticeMessage("error", message);
    } finally {
      setTemplateSubmitting(false);
    }
  }

  function handleApplyMappingTemplate(template: MappingTemplate) {
    if (!result) {
      setTemplateNoticeMessage(
        "error",
        "템플릿 적용 전에 먼저 파일을 업로드해주세요."
      );
      return;
    }

    const applied = buildTemplateApplicableMapping(
      template.mapping,
      result.headers
    );

    setMapping(applied.mapping);
    setSelectedTemplateId(template.id);

    if (applied.missingHeaders.length > 0) {
      setTemplateNoticeMessage(
        "info",
        `"${template.name}" 템플릿을 적용했습니다. 현재 파일에 없는 헤더는 제외했습니다: ${applied.missingHeaders.join(
          ", "
        )}`
      );
    } else {
      setTemplateNoticeMessage(
        "success",
        `"${template.name}" 템플릿을 적용했습니다.`
      );
    }
  }

  async function handleDeleteMappingTemplate(template: MappingTemplate) {
    const confirmed = window.confirm(
      `"${template.name}" 템플릿을 삭제할까요?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setTemplateSubmitting(true);
      await deleteMappingTemplateFromApi(template.id);

      const nextTemplates = mappingTemplates.filter(
        (item) => item.id !== template.id
      );

      setMappingTemplates(nextTemplates);

      if (selectedTemplateId === template.id) {
        setSelectedTemplateId("");
      }

      setTemplateNoticeMessage(
        "success",
        `"${template.name}" 템플릿을 삭제했습니다.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "템플릿 삭제 중 오류가 발생했습니다.";

      setTemplateNoticeMessage("error", message);
    } finally {
      setTemplateSubmitting(false);
    }
  }

  function handleExportTemplates() {
    if (mappingTemplates.length === 0) {
      setTemplateNoticeMessage("error", "내보낼 템플릿이 없습니다.");
      return;
    }

    const exportPayload = JSON.stringify(mappingTemplates, null, 2);

    downloadTextFile(
      exportPayload,
      `opsflow-light-mapping-templates-${new Date()
        .toISOString()
        .slice(0, 10)}.json`,
      "application/json;charset=utf-8;"
    );

    setTemplateNoticeMessage(
      "success",
      `템플릿 ${mappingTemplates.length}개를 JSON 파일로 내보냈습니다.`
    );
  }

  function handleOpenImportTemplates() {
    templateImportInputRef.current?.click();
  }

  async function handleImportTemplates(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    try {
      setTemplateSubmitting(true);

      const text = await file.text();
      const importedTemplates = parseTemplateArray(JSON.parse(text));

      if (importedTemplates.length === 0) {
        setTemplateNoticeMessage(
          "error",
          "가져올 수 있는 템플릿이 없습니다. JSON 형식을 확인해주세요."
        );
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;

      for (const imported of importedTemplates) {
        const { action } = await saveMappingTemplateToApi(
          imported.name,
          imported.mapping
        );

        if (action === "updated") {
          updatedCount += 1;
        } else {
          addedCount += 1;
        }
      }

      const refreshedTemplates = await fetchMappingTemplatesFromApi();
      setMappingTemplates(refreshedTemplates);

      setTemplateNoticeMessage(
        "success",
        `템플릿 가져오기 완료: 신규 ${addedCount}개, 덮어쓰기 ${updatedCount}개`
      );
    } catch {
      setTemplateNoticeMessage(
        "error",
        "템플릿 가져오기에 실패했습니다. JSON 파일 형식을 확인해주세요."
      );
    } finally {
      setTemplateSubmitting(false);
      setTemplateImportInputKey((prev) => prev + 1);
    }
  }

  function handleDownloadAllNormalizedCsv() {
    if (!result || displayRows.length === 0) {
      window.alert("다운로드할 정규화 결과가 없습니다.");
      return;
    }

    const csvText = buildNormalizedCsvText(displayRows);

    downloadCsvFile(
      csvText,
      createNormalizedCsvFileName(
        result.fileName,
        result.sheetName,
        "normalized-all"
      )
    );
  }

  function handleDownloadValidNormalizedCsv() {
    if (!result || validDisplayRows.length === 0) {
      window.alert("다운로드할 정상 행 데이터가 없습니다.");
      return;
    }

    const csvText = buildNormalizedCsvText(validDisplayRows);

    downloadCsvFile(
      csvText,
      createNormalizedCsvFileName(
        result.fileName,
        result.sheetName,
        "normalized-valid-only"
      )
    );
  }

  function handleDownloadErrorNormalizedCsv() {
    if (!result || errorDisplayRows.length === 0) {
      window.alert("다운로드할 오류 행 데이터가 없습니다.");
      return;
    }

    const csvText = buildNormalizedCsvText(errorDisplayRows);

    downloadCsvFile(
      csvText,
      createNormalizedCsvFileName(
        result.fileName,
        result.sheetName,
        "normalized-error-only"
      )
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "24px",
            padding: "32px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                OpsFlow Light
              </p>

              <h1
                style={{
                  marginTop: "16px",
                  marginBottom: "12px",
                  fontSize: "40px",
                  lineHeight: 1.2,
                }}
              >
                엑셀 업로드 미리보기
              </h1>

              <p
                style={{
                  margin: 0,
                  fontSize: "17px",
                  lineHeight: 1.7,
                  color: "#4b5563",
                  maxWidth: "880px",
                }}
              >
                엑셀 또는 CSV 파일을 업로드하면 원하는 시트를 선택하고, 표준 필드로
                자동 매핑된 결과를 확인하고, 검증 후 CSV로 내려받을 수 있습니다.
              </p>
            </div>

            <Link
              href="/light/history"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "48px",
                padding: "0 18px",
                borderRadius: "14px",
                textDecoration: "none",
                background: "#111827",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              업로드 이력 보기
            </Link>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                setSelectedSheetName("");
                setErrorMessage("");
                setResult(null);
                setTableFilter("all");
              }}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "14px",
                background: "#ffffff",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading ? "#9ca3af" : "#111827",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "14px 20px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "업로드 중..." : "미리보기 생성"}
              </button>

              <span style={{ color: "#6b7280", fontSize: "14px" }}>
                {selectedFile ? `선택 파일: ${selectedFile.name}` : "선택된 파일 없음"}
              </span>
            </div>
          </form>

          {result && result.sheetNames.length > 1 ? (
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxWidth: "320px",
              }}
            >
              <label
                htmlFor="sheetName"
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                시트 선택
              </label>

              <select
                id="sheetName"
                value={selectedSheetName}
                onChange={handleSheetChange}
                disabled={loading}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  background: "#ffffff",
                }}
              >
                {result.sheetNames.map((sheetName: string) => (
                  <option key={sheetName} value={sheetName}>
                    {sheetName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {errorMessage ? (
            <div
              style={{
                marginTop: "16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "14px",
                padding: "14px 16px",
                fontSize: "14px",
              }}
            >
              {errorMessage}
            </div>
          ) : null}
        </div>

        {result ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginTop: "20px",
              }}
            >
              <InfoCard label="파일명" value={result.fileName} />
              <InfoCard label="시트명" value={result.sheetName} />
              <InfoCard
                label="전체 행 수"
                value={`${result.rowCount.toLocaleString()}행`}
              />
              <InfoCard
                label="미리보기 행 수"
                value={`${result.previewCount.toLocaleString()}행`}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginTop: "20px",
              }}
            >
              <InfoCard
                label="검증 대상 행"
                value={`${validationResults.length.toLocaleString()}행`}
              />
              <InfoCard
                label="정상 행"
                value={`${validRowCount.toLocaleString()}행`}
              />
              <InfoCard
                label="오류 행"
                value={`${errorRowCount.toLocaleString()}행`}
              />
              <InfoCard
                label="필수 매핑"
                value={`${mappedRequiredFieldCount} / ${requiredFieldCount}`}
              />
            </div>

            <div
              style={{
                marginTop: "20px",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: "8px",
                      fontSize: "22px",
                    }}
                  >
                    컬럼 매핑
                  </h2>

                  <p
                    style={{
                      marginTop: 0,
                      marginBottom: 0,
                      color: "#6b7280",
                    }}
                  >
                    업로드된 헤더를 표준 필드에 자동 연결했습니다. 필요하면 직접
                    바꿔주세요.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "999px",
                      background: "#f3f4f6",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    매핑 완료 {mappedFieldCount} / {STANDARD_FIELDS.length}
                  </div>

                  <button
                    type="button"
                    onClick={handleResetAutoMapping}
                    style={{
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#111827",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    자동 매핑 다시 적용
                  </button>

                  <button
                    type="button"
                    onClick={handleClearMapping}
                    style={{
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#111827",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    매핑 전체 비우기
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                  marginTop: "20px",
                }}
              >
                {STANDARD_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "18px",
                      padding: "18px",
                      background: "#fafafa",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {field.label}
                      {field.required ? (
                        <span style={{ color: "#dc2626", marginLeft: "6px" }}>
                          *
                        </span>
                      ) : null}
                    </p>

                    <p
                      style={{
                        marginTop: "8px",
                        marginBottom: "12px",
                        fontSize: "13px",
                        color: "#6b7280",
                        lineHeight: 1.5,
                      }}
                    >
                      {field.description}
                    </p>

                    <select
                      value={mapping[field.key]}
                      onChange={(event) =>
                        handleMappingChange(field.key, event.target.value)
                      }
                      style={{
                        width: "100%",
                        border: "1px solid #d1d5db",
                        borderRadius: "12px",
                        padding: "10px 12px",
                        background: "#ffffff",
                      }}
                    >
                      <option value="">선택 안 함</option>
                      {result.headers.map((header: string) => (
                        <option key={`${field.key}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "18px",
                }}
              >
                {currentMappingSummary.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      border: "1px solid #e5e7eb",
                      background: item.header ? "#ffffff" : "#fafafa",
                      color: item.header ? "#111827" : "#6b7280",
                      borderRadius: "999px",
                      padding: "8px 12px",
                      fontSize: "13px",
                    }}
                  >
                    {item.label}: {item.header || "선택 안 함"}
                  </div>
                ))}
              </div>

              {missingRequiredFields.length > 0 ? (
                <div style={{ marginTop: "16px" }}>
                  <NoticeBox
                    tone="info"
                    message={`필수 표준 필드 매핑이 비어 있습니다: ${missingRequiredFields
                      .map((field) => field.label)
                      .join(", ")}`}
                  />
                </div>
              ) : null}

              {duplicateMappedHeaders.length > 0 ? (
                <div style={{ marginTop: "16px" }}>
                  <NoticeBox
                    tone="error"
                    message={`같은 헤더가 여러 표준 필드에 중복 선택되었습니다: ${duplicateMappedHeaders.join(
                      ", "
                    )}`}
                  />
                </div>
              ) : null}
            </div>

            <div
              style={{
                marginTop: "20px",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: "8px",
                      fontSize: "22px",
                    }}
                  >
                    매핑 템플릿
                  </h2>

                  <p
                    style={{
                      marginTop: 0,
                      marginBottom: "8px",
                      color: "#6b7280",
                    }}
                  >
                    자주 쓰는 컬럼 매핑을 템플릿으로 저장해 다음 업로드 때 바로
                    적용할 수 있습니다.
                  </p>

                  <p
                    style={{
                      marginTop: 0,
                      marginBottom: 0,
                      color: "#6b7280",
                      fontSize: "13px",
                    }}
                  >
                    현재 서버 DB에 저장되며, JSON 파일로 백업/복원이 가능합니다.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleExportTemplates}
                    disabled={templateLoading || templateSubmitting}
                    style={{
                      border: "1px solid #d1d5db",
                      background:
                        templateLoading || templateSubmitting ? "#f3f4f6" : "#ffffff",
                      color: "#111827",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      fontWeight: 700,
                      cursor:
                        templateLoading || templateSubmitting
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    템플릿 JSON 내보내기
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenImportTemplates}
                    disabled={templateLoading || templateSubmitting}
                    style={{
                      border: "1px solid #d1d5db",
                      background:
                        templateLoading || templateSubmitting ? "#f3f4f6" : "#ffffff",
                      color: "#111827",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      fontWeight: 700,
                      cursor:
                        templateLoading || templateSubmitting
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    템플릿 JSON 가져오기
                  </button>

                  <input
                    key={templateImportInputKey}
                    ref={templateImportInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportTemplates}
                    style={{ display: "none" }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginTop: "18px",
                }}
              >
                <input
                  type="text"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="예: 스마트스토어 주문 템플릿"
                  style={{
                    flex: "1 1 320px",
                    minWidth: "260px",
                    border: "1px solid #d1d5db",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    background: "#ffffff",
                  }}
                />

                <button
                  type="button"
                  onClick={handleSaveMappingTemplate}
                  disabled={!canSaveTemplate}
                  style={{
                    background: canSaveTemplate ? "#111827" : "#9ca3af",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    fontWeight: 700,
                    cursor: canSaveTemplate ? "pointer" : "not-allowed",
                  }}
                >
                  {templateSubmitting ? "저장 중..." : "현재 매핑 템플릿 저장"}
                </button>
              </div>

              {templateLoading ? (
                <div style={{ marginTop: "16px" }}>
                  <NoticeBox
                    tone="info"
                    message="저장된 템플릿 목록을 불러오는 중입니다."
                  />
                </div>
              ) : null}

              {templateNotice ? (
                <div style={{ marginTop: "16px" }}>
                  <NoticeBox tone={templateNoticeTone} message={templateNotice} />
                </div>
              ) : null}

              {!templateLoading && templateSummaries.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "16px",
                    marginTop: "20px",
                  }}
                >
                  {templateSummaries.map((template) => (
                    <div
                      key={template.id}
                      style={{
                        border:
                          selectedTemplateId === template.id
                            ? "1px solid #111827"
                            : "1px solid #e5e7eb",
                        borderRadius: "18px",
                        padding: "18px",
                        background: "#fafafa",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "16px",
                              fontWeight: 700,
                              color: "#111827",
                            }}
                          >
                            {template.name}
                          </p>

                          <p
                            style={{
                              margin: "8px 0 0",
                              fontSize: "13px",
                              color: "#6b7280",
                              lineHeight: 1.6,
                            }}
                          >
                            저장된 매핑 {template.savedMappedCount}개
                            <br />
                            최근 수정 {formatDateTimeLabel(template.updatedAt)}
                          </p>
                        </div>

                        {selectedTemplateId === template.id ? (
                          <div
                            style={{
                              background: "#111827",
                              color: "#ffffff",
                              borderRadius: "999px",
                              padding: "6px 10px",
                              fontSize: "12px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            선택됨
                          </div>
                        ) : null}
                      </div>

                      {result ? (
                        <div
                          style={{
                            marginTop: "14px",
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              borderRadius: "999px",
                              padding: "6px 10px",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            현재 파일 매칭 {template.matchedCount}개
                          </div>

                          <div
                            style={{
                              background:
                                template.missingCount > 0 ? "#fff7ed" : "#f0fdf4",
                              color:
                                template.missingCount > 0 ? "#9a3412" : "#166534",
                              border:
                                template.missingCount > 0
                                  ? "1px solid #fdba74"
                                  : "1px solid #bbf7d0",
                              borderRadius: "999px",
                              padding: "6px 10px",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            {template.missingCount > 0
                              ? `불일치 ${template.missingCount}개`
                              : "불일치 없음"}
                          </div>
                        </div>
                      ) : null}

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                          marginTop: "16px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleApplyMappingTemplate(template)}
                          disabled={!result || templateSubmitting}
                          style={{
                            background:
                              result && !templateSubmitting ? "#111827" : "#9ca3af",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "12px",
                            padding: "10px 14px",
                            fontWeight: 700,
                            cursor:
                              result && !templateSubmitting
                                ? "pointer"
                                : "not-allowed",
                          }}
                        >
                          템플릿 적용
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTemplateName(template.name);
                            setSelectedTemplateId(template.id);
                            setTemplateNoticeMessage(
                              "info",
                              `"${template.name}" 이름으로 덮어써 저장하려면 저장 버튼을 누르세요.`
                            );
                          }}
                          disabled={templateSubmitting}
                          style={{
                            border: "1px solid #d1d5db",
                            background: templateSubmitting ? "#f3f4f6" : "#ffffff",
                            color: "#111827",
                            borderRadius: "12px",
                            padding: "10px 14px",
                            fontWeight: 700,
                            cursor: templateSubmitting ? "not-allowed" : "pointer",
                          }}
                        >
                          이름 불러오기
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMappingTemplate(template)}
                          disabled={templateSubmitting}
                          style={{
                            border: "1px solid #fecaca",
                            background: templateSubmitting ? "#fef2f2" : "#ffffff",
                            color: "#b91c1c",
                            borderRadius: "12px",
                            padding: "10px 14px",
                            fontWeight: 700,
                            cursor: templateSubmitting ? "not-allowed" : "pointer",
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !templateLoading ? (
                <div style={{ marginTop: "16px" }}>
                  <NoticeBox
                    tone="info"
                    message="아직 저장된 매핑 템플릿이 없습니다. 현재 매핑을 만든 뒤 템플릿으로 저장해두면 다음 업로드에서 바로 재사용할 수 있습니다."
                  />
                </div>
              ) : null}
            </div>

            <div
              style={{
                marginTop: "20px",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: "8px",
                      fontSize: "22px",
                    }}
                  >
                    표준 필드 미리보기
                  </h2>

                  <p
                    style={{
                      marginTop: 0,
                      marginBottom: "8px",
                      color: "#6b7280",
                    }}
                  >
                    숫자는 쉼표와 원 표시를 제거해 정규화하고, 날짜는 가능한 경우
                    YYYY-MM-DD 형식으로 맞춰 보여줍니다.
                  </p>

                  <p
                    style={{
                      marginTop: 0,
                      marginBottom: 0,
                      color: "#6b7280",
                      fontSize: "13px",
                    }}
                  >
                    다운로드되는 CSV도 현재 화면의 정규화 결과 기준으로 생성됩니다.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleDownloadAllNormalizedCsv}
                    disabled={!canDownloadAllNormalizedCsv}
                    style={{
                      background: canDownloadAllNormalizedCsv ? "#111827" : "#9ca3af",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "14px",
                      padding: "12px 16px",
                      fontWeight: 700,
                      cursor: canDownloadAllNormalizedCsv ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                    }}
                  >
                    전체 CSV 다운로드
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadValidNormalizedCsv}
                    disabled={!canDownloadValidNormalizedCsv}
                    style={{
                      background: canDownloadValidNormalizedCsv ? "#0f766e" : "#9ca3af",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "14px",
                      padding: "12px 16px",
                      fontWeight: 700,
                      cursor: canDownloadValidNormalizedCsv ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                    }}
                  >
                    정상 행만 CSV 다운로드
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadErrorNormalizedCsv}
                    disabled={!canDownloadErrorNormalizedCsv}
                    style={{
                      background: canDownloadErrorNormalizedCsv ? "#b91c1c" : "#9ca3af",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "14px",
                      padding: "12px 16px",
                      fontWeight: 700,
                      cursor: canDownloadErrorNormalizedCsv ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                    }}
                  >
                    오류 행만 CSV 다운로드
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginTop: "18px",
                }}
              >
                <FilterButton
                  active={tableFilter === "all"}
                  onClick={() => setTableFilter("all")}
                >
                  전체 보기 ({displayRowBundles.length})
                </FilterButton>

                <FilterButton
                  active={tableFilter === "valid"}
                  onClick={() => setTableFilter("valid")}
                >
                  정상만 보기 ({validRowCount})
                </FilterButton>

                <FilterButton
                  active={tableFilter === "error"}
                  onClick={() => setTableFilter("error")}
                >
                  오류만 보기 ({errorRowCount})
                </FilterButton>
              </div>

              {errorRowCount > 0 ? (
                <div style={{ marginTop: "16px" }}>
                  <NoticeBox
                    tone="error"
                    message={`검증 결과 오류 행이 ${errorRowCount}건 있습니다. 전체 다운로드는 모든 행을 포함하고, 정상 행만 다운로드는 오류 없는 행만, 오류 행만 다운로드는 오류 행만 따로 내려받습니다.`}
                  />
                </div>
              ) : (
                <div style={{ marginTop: "16px" }}>
                  <NoticeBox
                    tone="success"
                    message="현재 미리보기 데이터는 검증 기준상 모두 정상입니다."
                  />
                </div>
              )}

              {errorTypeCounts.length > 0 ? (
                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  {errorTypeCounts.map(([message, count]) => (
                    <div
                      key={message}
                      style={{
                        background: "#fff7ed",
                        border: "1px solid #fdba74",
                        color: "#9a3412",
                        borderRadius: "999px",
                        padding: "8px 12px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      {message} {count}건
                    </div>
                  ))}
                </div>
              ) : null}

              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                  marginTop: "20px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 980,
                    background: "#ffffff",
                  }}
                >
                  <thead style={{ background: "#f9fafb" }}>
                    <tr>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          borderBottom: "1px solid #e5e7eb",
                          fontSize: "14px",
                          width: 80,
                        }}
                      >
                        행번호
                      </th>
                      {STANDARD_FIELDS.map((field) => (
                        <th
                          key={`normalized-${field.key}`}
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e5e7eb",
                            fontSize: "14px",
                          }}
                        >
                          {field.label}
                        </th>
                      ))}
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          borderBottom: "1px solid #e5e7eb",
                          fontSize: "14px",
                          minWidth: 260,
                        }}
                      >
                        검증 결과
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDisplayRows.length ? (
                      filteredDisplayRows.map((item) => (
                        <tr key={`normalized-row-${item.originalIndex}`}>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f3f4f6",
                              fontSize: "14px",
                              verticalAlign: "top",
                              color: "#6b7280",
                              fontWeight: 700,
                            }}
                          >
                            {item.originalIndex + 1}
                          </td>

                          {STANDARD_FIELDS.map((field) => {
                            const hasError = Boolean(
                              item.validation.fieldErrors[field.key]
                            );

                            return (
                              <td
                                key={`${item.originalIndex}-${field.key}`}
                                title={item.validation.fieldErrors[field.key] ?? ""}
                                style={{
                                  padding: "12px",
                                  borderBottom: "1px solid #f3f4f6",
                                  fontSize: "14px",
                                  verticalAlign: "top",
                                  background: hasError ? "#fef2f2" : "#ffffff",
                                  color: hasError ? "#b91c1c" : "#111827",
                                  fontWeight: hasError ? 700 : 400,
                                }}
                              >
                                {item.row[field.key]}
                              </td>
                            );
                          })}

                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f3f4f6",
                              fontSize: "14px",
                              verticalAlign: "top",
                              color: item.validation.hasError
                                ? "#b91c1c"
                                : "#166534",
                              fontWeight: 700,
                              background: item.validation.hasError
                                ? "#fff7ed"
                                : "#f0fdf4",
                            }}
                          >
                            {getValidationMessage(item.validation)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={STANDARD_FIELDS.length + 2}
                          style={{
                            padding: "20px",
                            textAlign: "center",
                            color: "#6b7280",
                          }}
                        >
                          표시할 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {errorDisplayRows.length > 0 ? (
              <div
                style={{
                  marginTop: "20px",
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "24px",
                  padding: "24px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: "8px",
                    fontSize: "22px",
                  }}
                >
                  오류 행 요약
                </h2>

                <p
                  style={{
                    marginTop: 0,
                    marginBottom: "20px",
                    color: "#6b7280",
                  }}
                >
                  현재 검증에서 오류로 잡힌 행은 {errorDisplayRows.length}건입니다.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {validationResults
                    .filter((item) => item.hasError)
                    .map((item) => (
                      <div
                        key={`error-row-${item.rowIndex}`}
                        style={{
                          border: "1px solid #fecaca",
                          background: "#fef2f2",
                          borderRadius: "14px",
                          padding: "14px 16px",
                          color: "#991b1b",
                          fontSize: "14px",
                          lineHeight: 1.6,
                        }}
                      >
                        {item.rowIndex + 1}행: {item.messages.join(" / ")}
                      </div>
                    ))}
                </div>
              </div>
            ) : null}

            <div
              style={{
                marginTop: "20px",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: "8px",
                  fontSize: "22px",
                }}
              >
                원본 시트 미리보기
              </h2>

              <p
                style={{
                  marginTop: 0,
                  marginBottom: "20px",
                  color: "#6b7280",
                }}
              >
                현재 선택한 시트의 원본 데이터입니다. 시트 목록:{" "}
                {result.sheetNames.join(", ")}
              </p>

              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: Math.max(result.headers.length * 140, 700),
                    background: "#ffffff",
                  }}
                >
                  <thead style={{ background: "#f9fafb" }}>
                    <tr>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          borderBottom: "1px solid #e5e7eb",
                          fontSize: "14px",
                          width: 80,
                        }}
                      >
                        행번호
                      </th>

                      {result.headers.map((header: string) => (
                        <th
                          key={header}
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e5e7eb",
                            fontSize: "14px",
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.length ? (
                      result.rows.map((row: LightPreviewRow, rowIndex: number) => (
                        <tr key={rowIndex}>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom: "1px solid #f3f4f6",
                              fontSize: "14px",
                              verticalAlign: "top",
                              color: "#6b7280",
                              fontWeight: 700,
                            }}
                          >
                            {rowIndex + 1}
                          </td>

                          {result.headers.map((header: string) => (
                            <td
                              key={`${rowIndex}-${header}`}
                              style={{
                                padding: "12px",
                                borderBottom: "1px solid #f3f4f6",
                                fontSize: "14px",
                                verticalAlign: "top",
                              }}
                            >
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={Math.max(result.headers.length + 1, 1)}
                          style={{
                            padding: "20px",
                            textAlign: "center",
                            color: "#6b7280",
                          }}
                        >
                          표시할 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "18px",
        padding: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          color: "#6b7280",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: "22px",
          fontWeight: 700,
          wordBreak: "break-word",
        }}
      >
        {value}
      </p>
    </div>
  );
}