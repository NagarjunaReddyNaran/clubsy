/**
 * CSV export utilities — runs client-side (browser) and server-side (API routes)
 */

export function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return "";
  const keys = headers ?? Object.keys(rows[0]);

  const escape = (val: unknown): string => {
    const str = val == null ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = keys.map(escape).join(",");
  const dataRows = rows.map((row) =>
    keys.map((k) => escape(row[k])).join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatDateForExport(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-CA"); // YYYY-MM-DD
}
