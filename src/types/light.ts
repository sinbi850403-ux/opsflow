export type LightPreviewRow = Record<string, string>;

export type LightPreviewResult = {
  fileName: string;
  sheetName: string;
  sheetNames: string[];
  headers: string[];
  rows: LightPreviewRow[];
  rowCount: number;
  previewCount: number;
};