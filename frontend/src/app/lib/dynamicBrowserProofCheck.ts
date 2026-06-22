import {
  generateVoteProofWithPreparedInput,
  type BrowserVoteProofInput,
  type MerklePathElements,
  type MerklePathIndices,
  type SolidityVoteCalldata,
} from "./browserProof";
import { buildDynamicProofInputPreview } from "./dynamicProofInputPreview";
import { currentElectionId, getIdentitySecret, listRegistrations } from "./localVoterRegistration";

export type DynamicBrowserProofCheckResult = {
  registrationId: string;
  candidateId: string;
  electionId: string;
  merkleRootPreview: string;
  nullifierHash: string;
  publicSignals: string[];
  calldata: SolidityVoteCalldata;
  calldataInput: string[];
  timingMs: number;
  warnings: string[];
};

function normalizeRegistrationId(registrationId: string) {
  const normalized = registrationId.trim();

  if (!normalized) {
    throw new Error("Registration ID is required.");
  }

  return normalized;
}

function toMerklePathElements(pathElements: string[]): MerklePathElements {
  if (pathElements.length !== 3) {
    throw new Error("Dynamic proof check requires exactly 3 Merkle path elements.");
  }

  return [pathElements[0], pathElements[1], pathElements[2]];
}

function toMerklePathIndices(pathIndices: number[]): MerklePathIndices {
  if (pathIndices.length !== 3) {
    throw new Error("Dynamic proof check requires exactly 3 Merkle path indices.");
  }

  return [pathIndices[0], pathIndices[1], pathIndices[2]];
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

export async function runDynamicBrowserProofCheck(
  registrationId: string,
  candidateId: string | number,
): Promise<DynamicBrowserProofCheckResult> {
  const registration = getRegistrationById(registrationId);
  const preview = await buildDynamicProofInputPreview(registrationId, candidateId);

  if (!preview.fullInputReady || !preview.nullifierHashPreview) {
    throw new Error("Dynamic proof dev check requires a full input preview with local identity material.");
  }

  const identityMaterial = getIdentitySecret(registration.userId, registration.electionId);

  if (!identityMaterial) {
    throw new Error("Local identity material is unavailable for this registration.");
  }

  const proofInput: BrowserVoteProofInput = {
    secretKey: identityMaterial.secret,
    candidateId: preview.candidateId,
    electionId: preview.electionId,
    merkleRoot: preview.merkleRootPreview,
    pathElements: toMerklePathElements(preview.pathElements),
    pathIndices: toMerklePathIndices(preview.pathIndices),
  };
  const proofResult = await generateVoteProofWithPreparedInput(
    proofInput,
    preview.nullifierHashPreview,
  );

  return {
    registrationId: preview.registrationId,
    candidateId: preview.candidateId,
    electionId: preview.electionId,
    merkleRootPreview: preview.merkleRootPreview,
    nullifierHash: preview.nullifierHashPreview,
    publicSignals: proofResult.publicSignals,
    calldata: proofResult.calldata,
    calldataInput: proofResult.calldata.input,
    timingMs: proofResult.timingMs,
    warnings: [
      ...preview.warnings,
      "Dynamic browser proof generated for dev check only. It is not submitted to the contract.",
      "Dashboard submission uses this calldata only through the explicit guarded dynamic submit action.",
    ],
  };
}
