"use client";

import { useEffect, useMemo, useState } from "react";
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

function escapeCsvCell(value: unknown) {
  const text =
    value === null || value === undefined ? "" : String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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

function createNormalizedCsvFileName(fileName: string, sheetName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const safeBaseName = baseName.replace(/[\\/:*?"<>|]/g, "-");
  const safeSheetName = sheetName.replace(/[\\/:*?"<>|]/g, "-");

  return `${safeBaseName}-${safeSheetName}-normalized.csv`;
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
    if (!result) {
      setMapping(createEmptyMapping());
      return;
    }

    setMapping(buildInitialMapping(result.headers));
  }, [result]);

  const normalizedRows = useMemo<NormalizedPreviewRow[]>(() => {
    if (!result) {
      return [];
    }

    return buildNormalizedRows(result.rows, mapping);
  }, [result, mapping]);

  const mappedFieldCount = useMemo(() => {
    return countMappedFields(mapping);
  }, [mapping]);

  const duplicateMappedHeaders = useMemo(() => {
    return findDuplicateMappedHeaders(mapping);
  }, [mapping]);

  const canDownloadNormalizedCsv = normalizedRows.length > 0 && Boolean(result);

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

  function handleMappingChange(
    fieldKey: StandardFieldKey,
    header: string
  ) {
    setMapping((prev) => ({
      ...prev,
      [fieldKey]: header,
    }));
  }

  function handleDownloadNormalizedCsv() {
    if (!result || normalizedRows.length === 0) {
      window.alert("다운로드할 정규화 결과가 없습니다.");
      return;
    }

    const csvText = buildNormalizedCsvText(normalizedRows);
    const blob = new Blob([`\uFEFF${csvText}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = createNormalizedCsvFileName(
      result.fileName,
      result.sheetName
    );

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
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
          maxWidth: "1100px",
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
            }}
          >
            엑셀 또는 CSV 파일을 업로드하면 원하는 시트를 선택하고, 표준 필드로
            자동 매핑된 결과를 미리 볼 수 있습니다.
          </p>

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
                  alignItems: "center",
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

              {duplicateMappedHeaders.length ? (
                <div
                  style={{
                    marginTop: "16px",
                    background: "#fff7ed",
                    border: "1px solid #fdba74",
                    color: "#9a3412",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    fontSize: "14px",
                  }}
                >
                  같은 헤더가 여러 표준 필드에 중복 선택되었습니다:{" "}
                  {duplicateMappedHeaders.join(", ")}
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
                      marginBottom: 0,
                      color: "#6b7280",
                    }}
                  >
                    현재 매핑 기준으로 정규화된 결과를 미리 보여줍니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadNormalizedCsv}
                  disabled={!canDownloadNormalizedCsv}
                  style={{
                    background: canDownloadNormalizedCsv ? "#111827" : "#9ca3af",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "14px",
                    padding: "12px 16px",
                    fontWeight: 700,
                    cursor: canDownloadNormalizedCsv ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap",
                  }}
                >
                  정규화 결과 CSV 다운로드
                </button>
              </div>

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
                    minWidth: 700,
                    background: "#ffffff",
                  }}
                >
                  <thead style={{ background: "#f9fafb" }}>
                    <tr>
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
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedRows.length ? (
                      normalizedRows.map(
                        (row: NormalizedPreviewRow, rowIndex: number) => (
                          <tr key={`normalized-row-${rowIndex}`}>
                            {STANDARD_FIELDS.map((field) => (
                              <td
                                key={`${rowIndex}-${field.key}`}
                                style={{
                                  padding: "12px",
                                  borderBottom: "1px solid #f3f4f6",
                                  fontSize: "14px",
                                  verticalAlign: "top",
                                }}
                              >
                                {row[field.key]}
                              </td>
                            ))}
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={STANDARD_FIELDS.length}
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
                    minWidth: result.headers.length * 140,
                    background: "#ffffff",
                  }}
                >
                  <thead style={{ background: "#f9fafb" }}>
                    <tr>
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
                          colSpan={Math.max(result.headers.length, 1)}
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