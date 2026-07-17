import type { DataCatalog, DataCatalogSummary } from "./types";

export function summarizeDataCatalog(catalog: DataCatalog): DataCatalogSummary {
  const categories = catalog.files.reduce<Record<string, number>>((acc, file) => {
    acc[file.category] = (acc[file.category] ?? 0) + 1;
    return acc;
  }, {});
  const keyColumns = [...new Set(catalog.files.flatMap((file) => file.keyColumns))].sort();
  const latestModifiedAt =
    catalog.files
      .map((file) => file.modifiedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  return {
    totalFiles: catalog.files.length,
    usableDataFiles: catalog.files.filter((file) => file.status === "usable").length,
    categories,
    keyColumns,
    latestModifiedAt
  };
}
