// src/lib/google-sheets/source.ts
// Purpose: front-end only helpers to load + normalize Google Sheets data into a Preview.

import {
  googleListSpreadsheets,
  googleGetSheetTabs,
  googleGetSheetValues,
} from "./api";

/** Generic row shape across the data layer. */
export type Row = Record<string, unknown>;

export interface PreviewMeta {
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
}

export interface Preview {
  headers: string[];
  rows: Row[];
  meta: PreviewMeta;
}

export interface SpreadsheetListItem {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink: string;
  owners?: { emailAddress?: string }[];
}

export interface SheetTab {
  id: number;
  name: string;
}

export interface NormalizeOptions {
  /** Sanitize header names (trim, collapse spaces, replace spaces with underscores, de-duplicate). Default: true */
  sanitizeHeaders?: boolean;
  /** Treat empty strings as nulls when building rows. Default: true */
  emptyStringAsNull?: boolean;
  /** Drop rows that are entirely empty (all fields null/empty). Default: true */
  dropCompletelyEmptyRows?: boolean;
}

/* ----------------------------- Header helpers ----------------------------- */

/**
 * Normalize raw header cells into consistent, unique header names.
 * Example: "Order N° " -> "Order_N°"; duplicate names get a numeric suffix.
 */
export function normalizeHeaders(
  rawHeaderCells: unknown[],
  options?: NormalizeOptions
): string[] {
  const shouldSanitize = options?.sanitizeHeaders !== false;
  const seenHeaderNames = new Set<string>();

  const normalizedHeaderNames = (rawHeaderCells ?? []).map((rawCell) => {
    let headerText = rawCell == null ? "" : String(rawCell);
    headerText = headerText.trim();

    if (shouldSanitize) {
      headerText = headerText.replace(/\s+/g, " "); // collapse internal whitespace
      headerText = headerText.replace(/ /g, "_");    // replace spaces with underscores
    }

    if (headerText === "") headerText = "col";

    // Ensure uniqueness
    let uniqueName = headerText;
    let suffixIndex = 1;
    while (seenHeaderNames.has(uniqueName)) {
      uniqueName = `${headerText}_${suffixIndex++}`;
    }
    seenHeaderNames.add(uniqueName);
    return uniqueName;
  });

  return normalizedHeaderNames;
}

/**
 * Trim trailing empty columns by scanning header and data rows,
 * then align each row length to the final header length.
 */
function trimColumnsAndAlign(
  headerCells: unknown[],
  dataMatrix: unknown[][]
): { trimmedHeaders: unknown[]; trimmedRows: unknown[][] } {
  const maxColumnCount = Math.max(
    headerCells.length,
    ...dataMatrix.map((row) => row.length)
  );

  let lastNonEmptyColumnIndex = -1;

  function cellHasContent(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    const asString = String(value).trim();
    return asString !== "";
    }

  for (let columnIndex = 0; columnIndex < maxColumnCount; columnIndex++) {
    const headerValue = headerCells[columnIndex];
    const anyDataInColumn = dataMatrix.some((row) => cellHasContent(row[columnIndex]));
    if (cellHasContent(headerValue) || anyDataInColumn) {
      lastNonEmptyColumnIndex = columnIndex;
    }
  }

  const finalColumnCount = lastNonEmptyColumnIndex + 1;
  const trimmedHeaders = headerCells.slice(0, finalColumnCount);
  const trimmedRows = dataMatrix.map((row) => row.slice(0, finalColumnCount));
  return { trimmedHeaders, trimmedRows };
}

/* ------------------------------ Row helpers ------------------------------- */

/**
 * Convert matrix of cell values to array of objects keyed by normalized headers.
 */
export function normalizeRows(
  rawRows: unknown[][],
  normalizedHeaders: string[],
  options?: NormalizeOptions
): Row[] {
  const treatEmptyAsNull = options?.emptyStringAsNull !== false;

  function normalizeCellValue(cell: unknown): unknown {
    if (cell == null) return null;
    const asString = String(cell);
    if (treatEmptyAsNull && asString.trim() === "") return null;
    return cell;
  }

  return rawRows.map((rowCells) => {
    const mappedRow: Row = {};
    for (let columnIndex = 0; columnIndex < normalizedHeaders.length; columnIndex++) {
      const columnName = normalizedHeaders[columnIndex];
      mappedRow[columnName] = normalizeCellValue(rowCells[columnIndex]);
    }
    return mappedRow;
  });
}

/**
 * Drop rows that are entirely empty (all values null/undefined/empty string).
 */
export function dropCompletelyEmptyRows(rows: Row[]): Row[] {
  return rows.filter((row) => {
    return Object.values(row).some((value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    });
  });
}

/* ----------------------------- Preview builder ---------------------------- */

/**
 * Build a Preview object from raw Google Sheets values matrix.
 * - `headerRow` is 1-based (like Google UI).
 * - Returns sanitized, unique headers and aligned row objects.
 */
export function buildPreviewFromValues(
  spreadsheetId: string,
  sheetName: string,
  headerRow: number,
  rawValues: unknown[][],
  options?: NormalizeOptions
): Preview {
  if (!Array.isArray(rawValues) || rawValues.length === 0) {
    return {
      headers: [],
      rows: [],
      meta: { spreadsheetId, sheetName, headerRow },
    };
  }

  const headerIndexZeroBased = Math.max(0, (headerRow || 1) - 1);
  const headerCells = rawValues[headerIndexZeroBased] ?? [];
  const dataMatrix = rawValues.slice(headerIndexZeroBased + 1);

  const { trimmedHeaders, trimmedRows } = trimColumnsAndAlign(headerCells, dataMatrix);
  const normalizedHeaderNames = normalizeHeaders(trimmedHeaders, options);

  let normalizedRowObjects = normalizeRows(trimmedRows, normalizedHeaderNames, options);

  if (options?.dropCompletelyEmptyRows !== false) {
    normalizedRowObjects = dropCompletelyEmptyRows(normalizedRowObjects);
  }

  return {
    headers: normalizedHeaderNames,
    rows: normalizedRowObjects,
    meta: { spreadsheetId, sheetName, headerRow },
  };
}

/* ----------------------------- High-level API ----------------------------- */

/**
 * Load values from Google Sheets and return a normalized Preview.
 * Uses googleGetSheetValues() which already returns formatted strings for dates.
 */
export async function loadPreviewFromGoogle(
  meta: PreviewMeta,
  options?: NormalizeOptions
): Promise<Preview> {
  const { spreadsheetId, sheetName, headerRow } = meta;
  const rawValues = await googleGetSheetValues(spreadsheetId, sheetName);
  return buildPreviewFromValues(spreadsheetId, sheetName, headerRow, rawValues, options);
}

/** Thin wrappers to keep consumers in one namespace. */
export async function listSpreadsheets(): Promise<SpreadsheetListItem[]> {
  return googleListSpreadsheets();
}

export async function getSheetTabs(spreadsheetId: string): Promise<SheetTab[]> {
  return googleGetSheetTabs(spreadsheetId);
}
