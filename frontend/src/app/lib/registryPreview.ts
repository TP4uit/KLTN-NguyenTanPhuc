import { currentElectionId, getApprovedCommitments } from "./localVoterRegistration";
import { poseidonHashPair } from "./poseidonIdentity";
import type { CommitmentScheme } from "./voterRegistrationModel";

export const REGISTRY_PREVIEW_TREE_DEPTH = 3;
export const REGISTRY_PREVIEW_CAPACITY = 2 ** REGISTRY_PREVIEW_TREE_DEPTH;

const PREVIEW_WARNING =
  "Poseidon preview root is generated from approved local Poseidon commitments. It is closer to the circuit registry, but still not proof-compatible until matching Merkle paths/proof inputs are generated.";
const EMPTY_LEAF_WARNING =
  "Preview pads unused depth-3 leaves with 0; the static fixture tree has eight populated leaves, so dynamic proof inputs must match this padding convention before using the preview root.";
const POSEIDON_COMPATIBLE_SCHEMES = new Set<CommitmentScheme>(["POSEIDON", "FIXTURE_POSEIDON"]);

export type RegistryPreviewLeaf = {
  registrationId: string;
  identityCommitment: string;
  commitmentScheme: CommitmentScheme;
};

export type RegistryPreviewIncompatibleLeaf = {
  registrationId: string;
  identityCommitment: string;
  commitmentScheme: CommitmentScheme;
  reason: string;
};

export type RegistryPreview = {
  electionId: string;
  generatedAt: string;
  treeDepth: number;
  capacity: number;
  hashFunction: "Poseidon";
  leafFormula: "identityCommitment";
  approvedCount: number;
  compatibleLeafCount: number;
  incompatibleLeafCount: number;
  overflow: boolean;
  merkleRootPreview: string;
  leaves: RegistryPreviewLeaf[];
  incompatibleLeaves: RegistryPreviewIncompatibleLeaf[];
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

function sortLeaves<T extends Pick<RegistryPreviewLeaf, "identityCommitment" | "registrationId">>(leaves: T[]) {
  return [...leaves].sort((left, right) => {
    const byCommitment = left.identityCommitment.localeCompare(right.identityCommitment);

    if (byCommitment !== 0) {
      return byCommitment;
    }

    return left.registrationId.localeCompare(right.registrationId);
  });
}

function buildLeafLevel(leaves: RegistryPreviewLeaf[]) {
  const leafHashes = leaves.map((leaf) => leaf.identityCommitment);
  return [
    ...leafHashes,
    ...Array.from({ length: REGISTRY_PREVIEW_CAPACITY - leafHashes.length }, () => "0"),
  ];
}

async function buildLevels(leaves: RegistryPreviewLeaf[]) {
  const levels = [buildLeafLevel(leaves)];

  for (let depth = 0; depth < REGISTRY_PREVIEW_TREE_DEPTH; depth += 1) {
    const currentLevel = levels[levels.length - 1];
    const nextLevel: string[] = [];

    for (let index = 0; index < currentLevel.length; index += 2) {
      nextLevel.push(await poseidonHashPair(currentLevel[index], currentLevel[index + 1]));
    }

    levels.push(nextLevel);
  }

  return levels;
}

export async function buildRegistryPreview(electionId = currentElectionId): Promise<RegistryPreview> {
  const normalizedElectionId = normalizeElectionId(electionId);
  const approvedCommitments = getApprovedCommitments(normalizedElectionId);
  const compatibleApprovedLeaves = sortLeaves(
    approvedCommitments
      .filter((commitment) => POSEIDON_COMPATIBLE_SCHEMES.has(commitment.commitmentScheme))
      .map((commitment) => ({
        registrationId: commitment.registrationId,
        identityCommitment: commitment.identityCommitment,
        commitmentScheme: commitment.commitmentScheme,
      })),
  );
  const incompatibleLeaves = sortLeaves(
    approvedCommitments
      .filter((commitment) => !POSEIDON_COMPATIBLE_SCHEMES.has(commitment.commitmentScheme))
      .map((commitment) => ({
        registrationId: commitment.registrationId,
        identityCommitment: commitment.identityCommitment,
        commitmentScheme: commitment.commitmentScheme,
        reason:
          commitment.commitmentScheme === "SHA256_DEMO"
            ? "SHA256_DEMO commitments are excluded because the Poseidon preview leaf is the identityCommitment field directly."
            : `Unsupported commitmentScheme ${commitment.commitmentScheme}.`,
      })),
  );
  const overflow = compatibleApprovedLeaves.length > REGISTRY_PREVIEW_CAPACITY;
  const leaves = compatibleApprovedLeaves.slice(0, REGISTRY_PREVIEW_CAPACITY);
  const levels = await buildLevels(leaves);
  const warnings = [PREVIEW_WARNING, EMPTY_LEAF_WARNING];

  if (incompatibleLeaves.length > 0) {
    warnings.push(
      `${incompatibleLeaves.length} approved SHA256_DEMO registration${
        incompatibleLeaves.length === 1 ? " is" : "s are"
      } excluded from the Poseidon preview leaves.`,
    );
  }

  if (overflow) {
    warnings.push(
      `Poseidon-compatible approved commitments exceed preview capacity ${REGISTRY_PREVIEW_CAPACITY}; only the first ${REGISTRY_PREVIEW_CAPACITY} deterministic leaves are included in merkleRootPreview.`,
    );
  }

  return {
    electionId: normalizedElectionId,
    generatedAt: new Date().toISOString(),
    treeDepth: REGISTRY_PREVIEW_TREE_DEPTH,
    capacity: REGISTRY_PREVIEW_CAPACITY,
    hashFunction: "Poseidon",
    leafFormula: "identityCommitment",
    approvedCount: approvedCommitments.length,
    compatibleLeafCount: compatibleApprovedLeaves.length,
    incompatibleLeafCount: incompatibleLeaves.length,
    overflow,
    merkleRootPreview: levels[levels.length - 1][0],
    leaves,
    incompatibleLeaves,
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
