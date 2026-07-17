import { describe, expect, it } from "vitest";
import { summarizeDataCatalog } from "./dataCatalog";
import type { DataCatalog } from "./types";

const catalog: DataCatalog = {
  generatedAt: "2026-06-17T00:00:00.000Z",
  roots: ["/open-data", "/rent-tool"],
  files: [
    {
      id: "population",
      root: "/open-data",
      relativePath: "人口データ.csv",
      absolutePath: "/open-data/人口データ.csv",
      name: "人口データ.csv",
      extension: ".csv",
      sizeBytes: 100,
      modifiedAt: "2026-06-01T00:00:00.000Z",
      category: "population",
      status: "usable",
      encoding: "Shift_JIS",
      recordCount: 20,
      columns: ["city_code", "総人口"],
      keyColumns: ["city_code"],
      notes: ["sample"]
    },
    {
      id: "readme",
      root: "/rent-tool",
      relativePath: "README.md",
      absolutePath: "/rent-tool/README.md",
      name: "README.md",
      extension: ".md",
      sizeBytes: 10,
      modifiedAt: "2026-06-01T00:00:00.000Z",
      category: "documentation",
      status: "reference",
      encoding: "UTF-8",
      recordCount: null,
      columns: [],
      keyColumns: [],
      notes: []
    }
  ]
};

describe("data catalog summary", () => {
  it("summarizes usable data files and discovered keys", () => {
    const summary = summarizeDataCatalog(catalog);

    expect(summary.totalFiles).toBe(2);
    expect(summary.usableDataFiles).toBe(1);
    expect(summary.categories).toEqual({ documentation: 1, population: 1 });
    expect(summary.keyColumns).toEqual(["city_code"]);
  });
});
