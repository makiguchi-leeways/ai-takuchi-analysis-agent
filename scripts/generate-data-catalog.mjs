import { createReadStream } from "node:fs";
import { readdir, open, readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { join, relative, extname, basename } from "node:path";
import { TextDecoder } from "node:util";

const roots = (process.env.DATA_CATALOG_ROOTS ?? "")
  .split(":")
  .map((root) => root.trim())
  .filter(Boolean);

if (roots.length === 0) {
  console.warn("DATA_CATALOG_ROOTS is not set. Writing an empty data catalog.");
}

const outputPath = join(process.cwd(), "src", "data", "data_catalog.json");
const ignoredDirectories = new Set(["node_modules", ".next", ".git", "dist", "coverage"]);
const secretLike = [/^\.env(\.|$)/, /APIキー/];

function makeId(filePath) {
  return filePath
    .replace(/^\/Users\/makiguchishigenori\/Projects\//, "")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9一-龠ぁ-んァ-ンー]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function detectCategory(name, extension, absolutePath) {
  if (name.includes("人口")) return "population";
  if (name.includes("世帯年収")) return "income";
  if (name.includes("世帯")) return "household";
  if (name.includes("物件")) return "property";
  if (name.includes("地価")) return "land-price";
  if ([".geojson", ".json"].includes(extension) && /学校区|市街地|用途地域/.test(name)) return "geojson";
  if (/Gate-API|API/.test(name)) return "api";
  if ([".ts", ".tsx", ".js", ".mjs"].includes(extension) || absolutePath.includes("/src/")) return "source-code";
  if ([".md", ".rtf", ".pdf", ".pptx"].includes(extension)) return "documentation";
  if (/package|tsconfig|next\.config|vitest\.config|\.env/.test(name)) return "config";
  return "other";
}

function statusFor(category, extension, name) {
  if (secretLike.some((pattern) => pattern.test(name))) return "reference";
  if (["population", "household", "income", "property", "land-price", "geojson"].includes(category)) return "usable";
  if (category === "source-code" || category === "api" || category === "documentation") return "reference";
  if ([".csv", ".json", ".geojson", ".xlsx"].includes(extension)) return "needs-mapping";
  return "reference";
}

function keyColumns(columns) {
  const candidates = [
    "pref_code",
    "city_code",
    "city_cd",
    "key_code",
    "town_choji_code",
    "町丁目コード",
    "住所",
    "address",
    "x_code",
    "y_code",
    "lat",
    "lng"
  ];
  return candidates.filter((candidate) => columns.includes(candidate));
}

function decodeCsv(buffer) {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  const shiftJis = new TextDecoder("shift_jis").decode(buffer);
  const badUtf8 = (utf8.match(/\uFFFD/g) ?? []).length;
  const badShiftJis = (shiftJis.match(/\uFFFD/g) ?? []).length;
  return badShiftJis < badUtf8 ? { text: shiftJis, encoding: "Shift_JIS" } : { text: utf8, encoding: "UTF-8" };
}

function splitCsvHeader(header) {
  const columns = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < header.length; index += 1) {
    const char = header[index];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      columns.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  columns.push(current.trim());
  return columns.filter(Boolean);
}

async function inspectFile(absolutePath, extension, name) {
  if (secretLike.some((pattern) => pattern.test(name))) {
    return {
      encoding: null,
      recordCount: null,
      columns: [],
      keyColumns: [],
      notes: ["credential-like file; content intentionally not read"]
    };
  }

  if (extension === ".csv") {
    const buffer = await readHead(absolutePath);
    const { text, encoding } = decodeCsv(buffer);
    const lines = text.split(/\r?\n/).filter(Boolean);
    const columns = splitCsvHeader(lines[0] ?? "");
    const lineCount = await countLines(absolutePath);
    return {
      encoding,
      recordCount: Math.max(0, lineCount - 1),
      columns: columns.slice(0, 80),
      keyColumns: keyColumns(columns),
      notes: columns.length > 80 ? [`columns truncated from ${columns.length} to 80`] : []
    };
  }

  if (extension === ".json" || extension === ".geojson") {
    const text = new TextDecoder("utf-8").decode(await readHead(absolutePath));
    const lines = text.split(/\r?\n/).filter(Boolean);
    const lineCount = await countLines(absolutePath);
    let columns = [];
    try {
      const first = JSON.parse(lines[0] ?? "{}");
      const properties = first.properties ?? first.features?.[0]?.properties ?? first;
      columns = Object.keys(properties);
    } catch {
      columns = [];
    }
    return {
      encoding: "UTF-8",
      recordCount: lineCount,
      columns: columns.slice(0, 80),
      keyColumns: keyColumns(columns),
      notes: lineCount > 1 ? ["newline-delimited JSON-like records"] : []
    };
  }

  return {
    encoding: [".md", ".ts", ".tsx", ".js", ".mjs", ".json"].includes(extension) ? "UTF-8" : null,
    recordCount: null,
    columns: [],
    keyColumns: [],
    notes: []
  };
}

async function readHead(absolutePath, byteLength = 256 * 1024) {
  const handle = await open(absolutePath, "r");
  try {
    const buffer = Buffer.alloc(byteLength);
    const { bytesRead } = await handle.read(buffer, 0, byteLength, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function countLines(absolutePath) {
  return new Promise((resolve, reject) => {
    let lines = 0;
    createReadStream(absolutePath)
      .on("data", (chunk) => {
        for (const byte of chunk) {
          if (byte === 10) lines += 1;
        }
      })
      .on("error", reject)
      .on("end", () => resolve(lines));
  });
}

async function walk(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await walk(root, absolutePath)));
      }
      continue;
    }
    if (!entry.isFile()) continue;

    const fileStat = await stat(absolutePath);
    const extension = extname(entry.name).toLowerCase();
    const category = detectCategory(entry.name, extension, absolutePath);
    const inspection = await inspectFile(absolutePath, extension, entry.name);
    files.push({
      id: makeId(absolutePath),
      root,
      relativePath: relative(root, absolutePath),
      absolutePath,
      name: basename(absolutePath),
      extension,
      sizeBytes: fileStat.size,
      modifiedAt: fileStat.mtime.toISOString(),
      category,
      status: statusFor(category, extension, entry.name),
      ...inspection
    });
  }
  return files;
}

const files = [];
for (const root of roots) {
  files.push(...(await walk(root)));
}

files.sort((a, b) => a.category.localeCompare(b.category) || a.relativePath.localeCompare(b.relativePath));
await mkdir(join(process.cwd(), "src", "data"), { recursive: true });
await writeFile(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      roots,
      files
    },
    null,
    2
  )
);

console.log(`wrote ${outputPath}`);
console.log(`cataloged ${files.length} files`);
