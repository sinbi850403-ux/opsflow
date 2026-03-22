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

export type StandardFieldKey = "itemName" | "qty" | "amount" | "date";

export type StandardFieldMapping = Record<StandardFieldKey, string>;

export type NormalizedPreviewRow = Record<StandardFieldKey, string>;