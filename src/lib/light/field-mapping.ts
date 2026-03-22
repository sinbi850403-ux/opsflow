import type {
  LightPreviewRow,
  NormalizedPreviewRow,
  StandardFieldKey,
  StandardFieldMapping,
} from "../../types/light";

type StandardFieldConfig = {
  key: StandardFieldKey;
  label: string;
  description: string;
  required: boolean;
  aliases: string[];
};

export const STANDARD_FIELDS: StandardFieldConfig[] = [
  {
    key: "itemName",
    label: "상품명",
    description: "상품명, 품목명, 제품명 등",
    required: true,
    aliases: [
      "상품명",
      "품목명",
      "제품명",
      "상품",
      "품목",
      "제품",
      "model",
      "item",
      "itemname",
      "product",
      "productname",
      "name",
    ],
  },
  {
    key: "qty",
    label: "수량",
    description: "수량, 판매수량, 출고수량 등",
    required: true,
    aliases: [
      "수량",
      "판매수량",
      "출고수량",
      "주문수량",
      "qty",
      "quantity",
      "count",
      "ea",
    ],
  },
  {
    key: "amount",
    label: "금액",
    description: "금액, 매출액, 공급가액 등",
    required: true,
    aliases: [
      "금액",
      "매출액",
      "공급가액",
      "합계금액",
      "판매금액",
      "출고금액",
      "금액합계",
      "amount",
      "price",
      "sales",
      "total",
      "value",
    ],
  },
  {
    key: "date",
    label: "거래일자",
    description: "거래일자, 주문일자, 날짜 등",
    required: false,
    aliases: [
      "거래일자",
      "주문일자",
      "판매일자",
      "출고일자",
      "날짜",
      "date",
      "orderdate",
      "salesdate",
      "createdat",
    ],
  },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_\-()/.]/g, "");
}

function createScore(header: string, aliases: string[]) {
  const normalizedHeader = normalizeText(header);
  let bestScore = 0;

  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);

    if (!normalizedAlias) {
      continue;
    }

    if (normalizedHeader === normalizedAlias) {
      bestScore = Math.max(bestScore, 100);
      continue;
    }

    if (normalizedHeader.includes(normalizedAlias)) {
      bestScore = Math.max(bestScore, 70);
      continue;
    }

    if (normalizedAlias.includes(normalizedHeader)) {
      bestScore = Math.max(bestScore, 50);
      continue;
    }
  }

  return bestScore;
}

export function createEmptyMapping(): StandardFieldMapping {
  return {
    itemName: "",
    qty: "",
    amount: "",
    date: "",
  };
}

export function buildInitialMapping(headers: string[]): StandardFieldMapping {
  const mapping = createEmptyMapping();
  const usedHeaders = new Set<string>();

  for (const field of STANDARD_FIELDS) {
    let bestHeader = "";
    let bestScore = 0;

    for (const header of headers) {
      if (usedHeaders.has(header)) {
        continue;
      }

      const score = createScore(header, field.aliases);

      if (score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }

    if (bestHeader) {
      mapping[field.key] = bestHeader;
      usedHeaders.add(bestHeader);
    }
  }

  return mapping;
}

export function buildNormalizedRows(
  rows: LightPreviewRow[],
  mapping: StandardFieldMapping
): NormalizedPreviewRow[] {
  return rows.map((row) => ({
    itemName: mapping.itemName ? row[mapping.itemName] ?? "" : "",
    qty: mapping.qty ? row[mapping.qty] ?? "" : "",
    amount: mapping.amount ? row[mapping.amount] ?? "" : "",
    date: mapping.date ? row[mapping.date] ?? "" : "",
  }));
}

export function countMappedFields(mapping: StandardFieldMapping) {
  return STANDARD_FIELDS.filter((field) => Boolean(mapping[field.key])).length;
}

export function findDuplicateMappedHeaders(mapping: StandardFieldMapping) {
  const counts: Record<string, number> = {};

  for (const header of Object.values(mapping)) {
    if (!header) {
      continue;
    }

    counts[header] = (counts[header] ?? 0) + 1;
  }

  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([header]) => header);
}