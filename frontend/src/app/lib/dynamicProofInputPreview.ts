import {
  currentElectionId,
  getIdentitySecret,
  getRegistrationCommitmentScheme,
  listRegistrations,
} from "./localVoterRegistration";
import { derivePoseidonNullifierHash } from "./poseidonIdentity";
import { buildRegistryPreview, type RegistryPreviewLeaf } from "./registryPreview";
import type { CommitmentScheme, VoterRegistration } from "./voterRegistrationModel";

const COMPATIBLE_COMMITMENT_SCHEMES = new Set<CommitmentScheme>(["POSEIDON", "FIXTURE_POSEIDON"]);

export type DynamicProofInputReadinessStatus = "READY" | "PATH_ONLY" | "INCOMPATIBLE" | "BLOCKED";

export type DynamicProofInputReadiness = {
  registrationId: string;
  electionId: string;
  commitmentScheme: CommitmentScheme;
  status: DynamicProofInputReadinessStatus;
  canBuildMerklePathPreview: boolean;
  canBuildFullInputPreview: boolean;
  reason: string;
  warnings: string[];
  leafIndex?: number;
};

export type DynamicMerklePathPreview = {
  electionId: string;
  registrationId: string;
  identityCommitment: string;
  commitmentScheme: CommitmentScheme;
  leafIndex: number;
  merkleRootPreview: string;
  pathElements: string[];
  pathIndices: number[];
  warnings: string[];
};

export type DynamicProofInputPreview = DynamicMerklePathPreview & {
  candidateId: string;
  fullInputReady: boolean;
  nullifierHashPreview?: string;
};

function normalizeRegistrationId(registrationId: string) {
  const normalized = registrationId.trim();

  if (!normalized) {
    throw new Error("Registration ID is required.");
  }

  return normalized;
}

function normalizeCandidateId(candidateId: string | number) {
  const normalized = candidateId.toString().trim();

  if (!/^\d+$/.test(normalized) || BigInt(normalized) <= 0n) {
    throw new Error("Candidate ID must be a positive integer.");
  }

  return normalized;
}

function getRegistrationById(registrationId: string) {
  const normalizedRegistrationId = normalizeRegistrationId(registrationId);
  const registration = listRegistrations(currentElectionId).find(
    (candidate) => candidate.id === normalizedRegistrationId,
  );

  if (!registration) {
    throw new Error("Registration was not found for the current election.");
  }

  return registration;
}

function isCompatibleScheme(commitmentScheme: CommitmentScheme) {
  return COMPATIBLE_COMMITMENT_SCHEMES.has(commitmentScheme);
}

function findLeafIndex(leaves: RegistryPreviewLeaf[], registrationId: string) {
  return leaves.findIndex((leaf) => leaf.registrationId === registrationId);
}

function buildPathFromLevels(levels: string[][], leafIndex: number) {
  const pathElements: string[] = [];
  const pathIndices: number[] = [];
  let index = leafIndex;

  for (let depth = 0; depth < levels.length - 1; depth += 1) {
    const siblingIndex = index ^ 1;
    pathElements.push(levels[depth][siblingIndex]);
    pathIndices.push(index % 2);
    index = Math.floor(index / 2);
  }

  return { pathElements, pathIndices };
}

function previewOnlyWarnings() {
  return [
    "Dynamic artifact preview only. Dashboard submission still uses the static fixture path.",
    "The preview root should not be used as the contract root until dynamic browser generation is wired safely.",
  ];
}

export async function getDynamicProofInputReadiness(
  registration: VoterRegistration,
): Promise<DynamicProofInputReadiness> {
  const commitmentScheme = getRegistrationCommitmentScheme(registration);
  const warnings = previewOnlyWarnings();

  if (registration.status !== "APPROVED") {
    return {
      registrationId: registration.id,
      electionId: registration.electionId,
      commitmentScheme,
      status: "BLOCKED",
      canBuildMerklePathPreview: false,
      canBuildFullInputPreview: false,
      reason: "Registration must be approved before dynamic artifacts can be previewed.",
      warnings,
    };
  }

  if (!isCompatibleScheme(commitmentScheme)) {
    return {
      registrationId: registration.id,
      electionId: registration.electionId,
      commitmentScheme,
      status: "INCOMPATIBLE",
      canBuildMerklePathPreview: false,
      canBuildFullInputPreview: false,
      reason: `${commitmentScheme} registrations are excluded from the Poseidon registry preview.`,
      warnings,
    };
  }

  const registryPreview = await buildRegistryPreview(registration.electionId);
  const leafIndex = findLeafIndex(registryPreview.leaves, registration.id);

  if (leafIndex < 0) {
    const overflowReason = registryPreview.overflow
      ? `Registration is Poseidon-compatible but excluded because preview capacity is ${registryPreview.capacity}.`
      : "Registration is Poseidon-compatible but was not found in registry preview leaves.";

    return {
      registrationId: registration.id,
      electionId: registration.electionId,
      commitmentScheme,
      status: "BLOCKED",
      canBuildMerklePathPreview: false,
      canBuildFullInputPreview: false,
      reason: overflowReason,
      warnings,
    };
  }

  const hasIdentityMaterial = Boolean(getIdentitySecret(registration.userId, registration.electionId));

  if (!hasIdentityMaterial) {
    return {
      registrationId: registration.id,
      electionId: registration.electionId,
      commitmentScheme,
      status: "PATH_ONLY",
      canBuildMerklePathPreview: true,
      canBuildFullInputPreview: false,
      reason: "Local identity material is unavailable; only the Merkle path preview can be built.",
      warnings,
      leafIndex,
    };
  }

  return {
    registrationId: registration.id,
    electionId: registration.electionId,
    commitmentScheme,
    status: "READY",
    canBuildMerklePathPreview: true,
    canBuildFullInputPreview: true,
    reason: "Dynamic artifact preview is ready.",
    warnings,
    leafIndex,
  };
}

export async function buildDynamicMerklePathPreview(
  registrationId: string,
): Promise<DynamicMerklePathPreview> {
  const registration = getRegistrationById(registrationId);
  const readiness = await getDynamicProofInputReadiness(registration);

  if (!readiness.canBuildMerklePathPreview || readiness.leafIndex === undefined) {
    throw new Error(readiness.reason);
  }

  const registryPreview = await buildRegistryPreview(registration.electionId);
  const leaf = registryPreview.leaves[readiness.leafIndex];
  const { pathElements, pathIndices } = buildPathFromLevels(registryPreview.levels, readiness.leafIndex);

  return {
    electionId: registryPreview.electionId,
    registrationId: registration.id,
    identityCommitment: leaf.identityCommitment,
    commitmentScheme: leaf.commitmentScheme,
    leafIndex: readiness.leafIndex,
    merkleRootPreview: registryPreview.merkleRootPreview,
    pathElements,
    pathIndices,
    warnings: readiness.warnings,
  };
}

export async function buildDynamicProofInputPreview(
  registrationId: string,
  candidateId: string | number,
): Promise<DynamicProofInputPreview> {
  const registration = getRegistrationById(registrationId);
  const normalizedCandidateId = normalizeCandidateId(candidateId);
  const pathPreview = await buildDynamicMerklePathPreview(registrationId);
  const identityMaterial = getIdentitySecret(registration.userId, registration.electionId);

  if (!identityMaterial) {
    return {
      ...pathPreview,
      candidateId: normalizedCandidateId,
      fullInputReady: false,
      warnings: [
        ...pathPreview.warnings,
        "Local identity material is unavailable; nullifier hash preview is omitted.",
      ],
    };
  }

  return {
    ...pathPreview,
    candidateId: normalizedCandidateId,
    fullInputReady: true,
    nullifierHashPreview: await derivePoseidonNullifierHash(identityMaterial.secret, registration.electionId),
  };
}
