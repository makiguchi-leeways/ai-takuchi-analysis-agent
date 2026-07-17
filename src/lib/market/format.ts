import type { Quadrant } from "./types";

export function manYen(value: number) {
  return `${Math.round(value).toLocaleString("ja-JP")}万円`;
}

export function decimalManYen(value: number) {
  return `${value.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万円`;
}

export function percent(value: number) {
  return `${(value * 100).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}%`;
}

export function score(value: number) {
  return `${value.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}`;
}

export function bytes(value: number) {
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toLocaleString("ja-JP", { maximumFractionDigits: 1 })} MB`;
  if (value > 1024) return `${(value / 1024).toLocaleString("ja-JP", { maximumFractionDigits: 1 })} KB`;
  return `${value.toLocaleString("ja-JP")} B`;
}

export function quadrantLabel(quadrant: Quadrant) {
  return {
    "blue-ocean": "高流動性 × 供給不足",
    competitive: "高流動性 × 供給過多",
    niche: "低流動性 × 供給不足",
    "red-ocean": "低流動性 × 供給過多"
  }[quadrant];
}

export function quadrantTone(quadrant: Quadrant) {
  return {
    "blue-ocean": "tone-blue",
    competitive: "tone-amber",
    niche: "tone-green",
    "red-ocean": "tone-red"
  }[quadrant];
}
