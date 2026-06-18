import { currentElectionId, getApprovedCommitments } from "./localVoterRegistration";

export const REGISTRY_PREVIEW_TREE_DEPTH = 3;
export const REGISTRY_PREVIEW_CAPACITY = 2 ** REGISTRY_PREVIEW_TREE_DEPTH;

const BN254_FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const PREVIEW_WARNING =
  "Demo SHA-256 preview only. This is not the Poseidon registry used by the circuit and must not be used as the contract Merkle root yet.";

export type RegistryPreviewLeaf = {
  registrationId: string;
  identityCommitment: string;
};

export type RegistryPreview = {
  electionId: string;
  generatedAt: string;
  treeDepth: number;
  capacity: number;
  approvedCount: number;
  overflow: boolean;
  merkleRootPreview: string;
  leaves: RegistryPreviewLeaf[];
  levels: string[][];
  warnings: string[];
};

function normalizeElectionId(electionId?: string) {
  const normalized = (electionId ?? currentElectionId).trim();

  if (!normalized) {
    throw new Error("Election ID is required.");
  }

  return normalized;
}

function sortLeaves(leaves: RegistryPreviewLeaf[]) {
  return [...leaves].sort((left, right) => {
    const byCommitment = left.identityCommitment.localeCompare(right.identityCommitment);

    if (byCommitment !== 0) {
      return byCommitment;
    }

    return left.registrationId.localeCompare(right.registrationId);
  });
}

function bytesToBigInt(bytes: Uint8Array) {
  return bytes.reduce((value, byte) => (value << 8n) + BigInt(byte), 0n);
}

async function hashToFieldDecimal(parts: string[]) {
  if (!crypto.subtle) {
    throw new Error("Browser crypto.subtle is required to build the registry preview.");
  }

  // Demo preview hashing only. The production voting circuit uses Poseidon, not SHA-256.
  const encoded = new TextEncoder().encode(parts.join("|"));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));

  return (bytesToBigInt(digest) % BN254_FIELD_MODULUS).toString();
}

async function buildLeafLevel(leaves: RegistryPreviewLeaf[]) {
  const leafHashes = await Promise.all(
    leaves.map((leaf) => hashToFieldDecimal(["leaf", leaf.registrationId, leaf.identityCommitment])),
  );
  const emptyLeafHash = await hashToFieldDecimal(["empty", "leaf"]);

  return [
    ...leafHashes,
    ...Array.from({ length: REGISTRY_PREVIEW_CAPACITY - leafHashes.length }, () => emptyLeafHash),
  ];
}

async function buildLevels(leaves: RegistryPreviewLeaf[]) {
  const levels = [await buildLeafLevel(leaves)];

  for (let depth = 0; depth < REGISTRY_PREVIEW_TREE_DEPTH; depth += 1) {
    const currentLevel = levels[levels.length - 1];
    const nextLevel: string[] = [];

    for (let index = 0; index < currentLevel.length; index += 2) {
      nextLevel.push(await hashToFieldDecimal(["node", depth.toString(), currentLevel[index], currentLevel[index + 1]]));
    }

    levels.push(nextLevel);
  }

  return levels;
}

export async function buildRegistryPreview(electionId = currentElectionId): Promise<RegistryPreview> {
  const normalizedElectionId = normalizeElectionId(electionId);
  const approvedLeaves = sortLeaves(
    getApprovedCommitments(normalizedElectionId).map((commitment) => ({
      registrationId: commitment.registrationId,
      identityCommitment: commitment.identityCommitment,
    })),
  );
  const overflow = approvedLeaves.length > REGISTRY_PREVIEW_CAPACITY;
  const leaves = approvedLeaves.slice(0, REGISTRY_PREVIEW_CAPACITY);
  const levels = await buildLevels(leaves);
  const warnings = [PREVIEW_WARNING];

  if (overflow) {
    warnings.push(
      `Approved commitments exceed preview capacity ${REGISTRY_PREVIEW_CAPACITY}; only the first ${REGISTRY_PREVIEW_CAPACITY} deterministic leaves are included in merkleRootPreview.`,
    );
  }

  return {
    electionId: normalizedElectionId,
    generatedAt: new Date().toISOString(),
    treeDepth: REGISTRY_PREVIEW_TREE_DEPTH,
    capacity: REGISTRY_PREVIEW_CAPACITY,
    approvedCount: approvedLeaves.length,
    overflow,
    merkleRootPreview: levels[levels.length - 1][0],
    leaves,
    levels,
    warnings,
  };
}

export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

export function downloadJson(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
