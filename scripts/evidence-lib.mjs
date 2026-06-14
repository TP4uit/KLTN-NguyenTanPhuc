import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const evidenceDir = resolve(rootDir, "reports", "evidence");
export const publicInputOrder = [
  "nullifierHash",
  "candidateId",
  "electionId",
  "merkleRoot",
];

export function ensureEvidenceDir() {
  mkdirSync(evidenceDir, { recursive: true });
}

export function readJson(path, label = "JSON file") {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Missing or invalid ${label}: ${path}`, { cause: error });
  }
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function fileSize(path) {
  if (!existsSync(path)) {
    return {
      path: relativePath(path),
      exists: false,
      bytes: null,
    };
  }

  return {
    path: relativePath(path),
    exists: true,
    bytes: statSync(path).size,
  };
}

export function relativePath(path) {
  return path.replace(`${rootDir}\\`, "").replace(`${rootDir}/`, "").replaceAll("\\", "/");
}

export function normalizeField(value) {
  return BigInt(value).toString();
}

export function normalizeInputArray(values) {
  return values.map((value) => normalizeField(value));
}

export function nowIso() {
  return new Date().toISOString();
}

export function environment() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: rootDir,
  };
}

export function runSnarkjs(args) {
  if (process.platform === "win32") {
    return execFileSync("cmd.exe", ["/c", "npx", "snarkjs", ...args], {
      cwd: rootDir,
      encoding: "utf8",
    });
  }

  return execFileSync("npx", ["snarkjs", ...args], {
    cwd: rootDir,
    encoding: "utf8",
  });
}

export function parseR1csInfo(output) {
  const result = {};
  const cleanOutput = output.replace(/\u001b\[[0-9;]*m/g, "");

  for (const line of cleanOutput.split(/\r?\n/)) {
    const normalizedLine = line.replace(/^\s*\[INFO\]\s*snarkJS:\s*/i, "");
    const match = normalizedLine.match(/^\s*(?:# of )?([^:]+):\s*(.+?)\s*$/);
    if (match === null) {
      continue;
    }

    const key = match[1].trim().toLowerCase().replaceAll(" ", "_");
    const rawValue = match[2].trim();
    const numeric = Number(rawValue);
    result[key] = Number.isFinite(numeric) ? numeric : rawValue;
  }

  return result;
}

export function reportBase(kind) {
  return {
    kind,
    generatedAt: nowIso(),
    environment: environment(),
  };
}
