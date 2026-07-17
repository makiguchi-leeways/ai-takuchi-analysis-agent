import catalog from "@/data/data_catalog.json";
import { summarizeDataCatalog } from "./dataCatalog";
import type { DataCatalog } from "./types";

export const dataCatalog = catalog as DataCatalog;

export function getDataCatalogSummary() {
  return summarizeDataCatalog(dataCatalog);
}
