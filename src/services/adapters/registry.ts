import type { AdapterDataSource, GeoJsonAdapter } from "./types";

/** Server-side registry boundary. Add an adapter here after its official API contract is confirmed. */
export type AdapterRegistry = Partial<Record<AdapterDataSource, GeoJsonAdapter>>;

export function createAdapterRegistry(adapters: AdapterRegistry = {}): AdapterRegistry {
  return { ...adapters };
}
