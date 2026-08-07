export type AdapterDataSource = "gate" | "real-estate-library" | "estat" | "resas" | "hazard" | "google-maps" | "sample";

export type AdapterRuntimeStatus = "configured" | "unconfigured" | "error" | "empty";

export interface AdapterMetadata {
  source: AdapterDataSource;
  status: AdapterRuntimeStatus;
  sourceUrl?: string;
  referenceDate?: string;
  fetchedAt?: string;
  geography?: string;
  reason?: string;
}

export interface GeoJsonQuery {
  layerId: string;
  bounds: [number, number, number, number];
  year?: string;
}

export interface GeoJsonAdapter<T = unknown> {
  readonly source: AdapterDataSource;
  getLayer(query: GeoJsonQuery): Promise<{ data: T; metadata: AdapterMetadata }>;
}
