import * as XLSX from "xlsx";
import iconv from "iconv-lite";
import type { LightPreviewResult, LightPreviewRow } from "../../types/light";

function normalizeHeader(value: unknown, index: number) {
  const text = String(value ?? "").trim();

  if (!text) {
    return `column_${index + 1}`;
  }

  return text;
}

function isMeaningfulRow(row: unknown[]) {
  return row.some((cell) => String(cell ?? "").trim() !== "");
}

function looksBrokenKorean(text: string) {
  return /ï|¿½|ë|ì|ê|Ã|Â/.test(text);
}

function readCsvWorkbook(buffer: Buffer) {
  const utf8Text = iconv.decode(buffer, "utf-8");
  const utf8Workbook = XLSX.read(utf8Text, { type: "string" });

  const firstSheetName = utf8Workbook.SheetNames[0];
  const firstSheet = firstSheetName
    ? utf8Workbook.Sheets[firstSheetName]
    : undefined;

  const firstCell =
    firstSheet?.A1?.w ??
    firstSheet?.A1?.v?.toString() ??
    "";

  if (!looksBrokenKorean(firstCell)) {
    return utf8Workbook;
  }

  const cp949Text = iconv.decode(buffer, "cp949");
  return XLSX.read(cp949Text, { type: "string" });
}

function buildPreviewResult(
  workbook: XLSX.WorkBook,
  fileName: string,
  selectedSheetName?: string
): LightPreviewResult {
  if (!workbook.SheetNames.length) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  const sheetNames = workbook.SheetNames;
  const activeSheetName =
    selectedSheetName && sheetNames.includes(selectedSheetName)
      ? selectedSheetName
      : sheetNames[0];

  const activeSheet = workbook.Sheets[activeSheetName];

  if (!activeSheet) {
    throw new Error("선택한 시트를 읽을 수 없습니다.");
  }

  const matrix = XLSX.utils.sheet_to_json(activeSheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  if (!matrix.length) {
    return {
      fileName,
      sheetName: activeSheetName,
      sheetNames,
      headers: [],
      rows: [],
      rowCount: 0,
      previewCount: 0,
    };
  }

  const [headerRow = [], ...bodyRows] = matrix;
  const headers = (headerRow as unknown[]).map((cell, index) =>
    normalizeHeader(cell, index)
  );

  const meaningfulRows = bodyRows.filter((row) => isMeaningfulRow(row));
  const previewRows = meaningfulRows.slice(0, 20);

  const rows: LightPreviewRow[] = previewRows.map((row) => {
    const record: LightPreviewRow = {};

    headers.forEach((header, index) => {
      record[header] = String((row as unknown[])[index] ?? "");
    });

    return record;
  });

  return {
    fileName,
    sheetName: activeSheetName,
    sheetNames,
    headers,
    rows,
    rowCount: meaningfulRows.length,
    previewCount: rows.length,
  };
}

export function readWorkbookPreview(
  buffer: Buffer,
  fileName: string,
  selectedSheetName?: string
): LightPreviewResult {
  const lowerFileName = fileName.toLowerCase();

  const workbook =
    lowerFileName.endsWith(".csv")
      ? readCsvWorkbook(buffer)
      : XLSX.read(buffer, { type: "buffer" });

  return buildPreviewResult(workbook, fileName, selectedSheetName);
}