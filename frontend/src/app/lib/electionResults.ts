import type { Contract } from "ethers";
import { CANDIDATES, type CandidateMetadata } from "./candidates";
import { buildDemoModeReadiness, type DemoMode } from "./demoModeReadiness";
import { localElection, readLiveElectionLifecycle, type ElectionLifecycle } from "./localElection";

export type ElectionResultsSource = "metadata" | "on-chain";

export type CandidateVoteResult = CandidateMetadata & {
  votes: number;
};

export type ElectionResultsSnapshot = {
  results: CandidateVoteResult[];
  totalVotes: number;
  lifecycle: ElectionLifecycle;
  latestBlock: number;
  source: ElectionResultsSource;
  loadedAt: string;
  merkleRoot: string;
  demoMode: DemoMode;
  staticFixtureRoot: string;
  dynamicPreviewRoot: string;
  rootMatchesStaticFixture: boolean;
  rootMatchesDynamicPoseidon: boolean;
};

export type ResultsAuditCandidateTally = {
  candidateId: number;
  name: string;
  votes: number;
  sharePercent: number;
};

export type ResultsAuditSnapshot = {
  electionId: string;
  network: string;
  chainId: string;
  contractAddress: string;
  generatedAt: string;
  loadedAt: string;
  source: ElectionResultsSource;
  electionState: number;
  electionStateName: ElectionLifecycle["electionStateName"];
  latestBlock: number;
  merkleRoot: string;
  demoMode: DemoMode;
  staticFixtureRoot: string;
  dynamicPreviewRoot: string;
  rootMatchesStaticFixture: boolean;
  rootMatchesDynamicPoseidon: boolean;
  totalVotes: number;
  localApprovedVoters: number | null;
  localDemoTurnout: number | null;
  candidateTallies: ResultsAuditCandidateTally[];
  checks: {
    totalMatchesCandidateSum: boolean;
    hasOnChainSource: boolean;
    hasLiveLifecycle: boolean;
    hasMerkleRoot: boolean;
    hasKnownDemoMode: boolean;
    rootMatchesDeclaredMode: boolean;
  };
  warnings: string[];
};

export type ResultsAuditValidation = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

const FORBIDDEN_AUDIT_KEYS = [
  "identitySecret",
  "voterIdentity",
  "identityCommitment",
  "password",
  "voteChoice",
  "candidateChoice",
  "proof",
  "nullifier",
  "privateKey",
  "wallet",
  "privateWalletData",
  "walletPrivateData",
  "walletAddress",
  "txHash",
  "transactionHash",
];

type BlockProvider = {
  getBlockNumber(): Promise<number>;
};

const DEMO_MODES = new Set<DemoMode>(["STATIC_FIXTURE", "DYNAMIC_POSEIDON", "CUSTOM", "UNSET"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" && value[key].trim().length > 0;
}

function hasNumber(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "number" && Number.isFinite(value[key]);
}

function hasNonNegativeInteger(value: Record<string, unknown>, key: string) {
  return Number.isInteger(value[key]) && Number(value[key]) >= 0;
}

function hasNullableNonNegativeInteger(value: Record<string, unknown>, key: string) {
  return value[key] === null || hasNonNegativeInteger(value, key);
}

function hasNullableNumber(value: Record<string, unknown>, key: string) {
  return value[key] === null || hasNumber(value, key);
}

function hasBoolean(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "boolean";
}

function collectForbiddenAuditKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenAuditKeys(item, `${path}[${index}]`));
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const keyIsForbidden = FORBIDDEN_AUDIT_KEYS.some((forbiddenKey) =>
      key.toLowerCase().includes(forbiddenKey.toLowerCase()),
    );
    const currentPath = `${path}.${key}`;
    const nestedMatches = collectForbiddenAuditKeys(nestedValue, currentPath);

    return keyIsForbidden ? [currentPath, ...nestedMatches] : nestedMatches;
  });
}

function voteCountToNumber(value: unknown) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(BigInt(value));
  }

  if (value && typeof value === "object" && "toString" in value) {
    return Number(BigInt(value.toString()));
  }

  throw new Error("Contract returned an unsupported vote count.");
}

function normalizeRoot(value: string) {
  return value.trim();
}

function rootsMatch(left: string, right: string) {
  return normalizeRoot(left) === normalizeRoot(right);
}

function isZeroRoot(root: string) {
  const normalizedRoot = normalizeRoot(root);

  if (!normalizedRoot) {
    return true;
  }

  if (!/^\d+$/.test(normalizedRoot)) {
    return false;
  }

  return BigInt(normalizedRoot) === 0n;
}

function isKnownDemoMode(value: unknown): value is DemoMode {
  return typeof value === "string" && DEMO_MODES.has(value as DemoMode);
}

function rootMatchesDeclaredMode(input: {
  demoMode: DemoMode;
  merkleRoot: string;
  staticFixtureRoot: string;
  dynamicPreviewRoot: string;
  rootMatchesStaticFixture: boolean;
  rootMatchesDynamicPoseidon: boolean;
}) {
  if (input.demoMode === "STATIC_FIXTURE") {
    return input.rootMatchesStaticFixture && rootsMatch(input.merkleRoot, input.staticFixtureRoot);
  }

  if (input.demoMode === "DYNAMIC_POSEIDON") {
    return input.rootMatchesDynamicPoseidon && rootsMatch(input.merkleRoot, input.dynamicPreviewRoot);
  }

  if (input.demoMode === "CUSTOM") {
    return (
      !isZeroRoot(input.merkleRoot) &&
      !input.rootMatchesStaticFixture &&
      !input.rootMatchesDynamicPoseidon
    );
  }

  return isZeroRoot(input.merkleRoot) && !input.rootMatchesStaticFixture && !input.rootMatchesDynamicPoseidon;
}

export async function readOnChainElectionResults(
  contract: Contract,
  provider: BlockProvider,
  candidates = CANDIDATES,
): Promise<ElectionResultsSnapshot> {
  const [counts, lifecycle, latestBlock, rawMerkleRoot] = await Promise.all([
    Promise.all(candidates.map((candidate) => contract.getVotes(candidate.candidateId))),
    readLiveElectionLifecycle(contract),
    provider.getBlockNumber(),
    contract.merkleRoot(),
  ]);
  const merkleRoot = rawMerkleRoot.toString();
  const modeReadiness = await buildDemoModeReadiness(merkleRoot, lifecycle.electionState);

  const results = candidates.map((candidate, index) => ({
    ...candidate,
    votes: voteCountToNumber(counts[index]),
  }));

  return {
    results,
    totalVotes: results.reduce((sum, candidate) => sum + candidate.votes, 0),
    lifecycle,
    latestBlock,
    source: "on-chain",
    loadedAt: new Date().toISOString(),
    merkleRoot,
    demoMode: modeReadiness.activeMode,
    staticFixtureRoot: modeReadiness.staticFixtureRoot,
    dynamicPreviewRoot: modeReadiness.dynamicPreviewRoot,
    rootMatchesStaticFixture: rootsMatch(merkleRoot, modeReadiness.staticFixtureRoot),
    rootMatchesDynamicPoseidon: rootsMatch(merkleRoot, modeReadiness.dynamicPreviewRoot),
  };
}

function roundPercent(value: number) {
  return Number(value.toFixed(2));
}

export function buildResultsAuditSnapshot(
  snapshot: ElectionResultsSnapshot,
  localApprovedVoters: number | null,
): ResultsAuditSnapshot {
  const candidateSum = snapshot.results.reduce((sum, candidate) => sum + candidate.votes, 0);
  const totalMatchesCandidateSum = candidateSum === snapshot.totalVotes;
  const hasOnChainSource = snapshot.source === "on-chain";
  const hasLiveLifecycle = hasOnChainSource;
  const hasMerkleRoot = snapshot.merkleRoot.trim().length > 0;
  const hasKnownDemoMode = DEMO_MODES.has(snapshot.demoMode);
  const declaredModeMatchesRoot = rootMatchesDeclaredMode({
    demoMode: snapshot.demoMode,
    merkleRoot: snapshot.merkleRoot,
    staticFixtureRoot: snapshot.staticFixtureRoot,
    dynamicPreviewRoot: snapshot.dynamicPreviewRoot,
    rootMatchesStaticFixture: snapshot.rootMatchesStaticFixture,
    rootMatchesDynamicPoseidon: snapshot.rootMatchesDynamicPoseidon,
  });
  const localDemoTurnout =
    typeof localApprovedVoters === "number" && localApprovedVoters > 0
      ? roundPercent((snapshot.totalVotes / localApprovedVoters) * 100)
      : null;
  const warnings: string[] = [
    "This export contains public tally data and local demo registration counts only.",
    "localApprovedVoters and localDemoTurnout come from frontend-local demo registration metadata, not an on-chain voter registry.",
  ];

  if (!hasOnChainSource) {
    warnings.push("Results are not marked as on-chain data.");
  }

  if (!hasLiveLifecycle) {
    warnings.push("Election lifecycle was not loaded from the live contract.");
  }

  if (!totalMatchesCandidateSum) {
    warnings.push("Candidate tally sum does not match totalVotes.");
  }

  if (snapshot.demoMode === "CUSTOM") {
    warnings.push("Contract Merkle root is CUSTOM and does not match a supported local demo mode root.");
  }

  if (snapshot.demoMode === "UNSET") {
    warnings.push("Contract Merkle root is UNSET or zero; local demo submit paths are not root-compatible.");
  }

  if (!declaredModeMatchesRoot) {
    warnings.push("Declared demoMode does not match the exported Merkle root flags.");
  }

  if (localApprovedVoters === null) {
    warnings.push("Local approved voter count is unavailable.");
  } else if (localApprovedVoters === 0 && snapshot.totalVotes > 0) {
    warnings.push("On-chain votes exist, but local approved voter count is zero.");
  } else if (localApprovedVoters > 0 && snapshot.totalVotes > localApprovedVoters) {
    warnings.push("On-chain totalVotes exceeds local approved voter count.");
  }

  return {
    electionId: localElection.electionId,
    network: localElection.network,
    chainId: localElection.chainId,
    contractAddress: localElection.election.address,
    generatedAt: new Date().toISOString(),
    loadedAt: snapshot.loadedAt,
    source: snapshot.source,
    electionState: snapshot.lifecycle.electionState,
    electionStateName: snapshot.lifecycle.electionStateName,
    latestBlock: snapshot.latestBlock,
    merkleRoot: snapshot.merkleRoot,
    demoMode: snapshot.demoMode,
    staticFixtureRoot: snapshot.staticFixtureRoot,
    dynamicPreviewRoot: snapshot.dynamicPreviewRoot,
    rootMatchesStaticFixture: snapshot.rootMatchesStaticFixture,
    rootMatchesDynamicPoseidon: snapshot.rootMatchesDynamicPoseidon,
    totalVotes: snapshot.totalVotes,
    localApprovedVoters,
    localDemoTurnout,
    candidateTallies: snapshot.results.map((candidate) => ({
      candidateId: candidate.candidateId,
      name: candidate.name,
      votes: candidate.votes,
      sharePercent: snapshot.totalVotes > 0 ? roundPercent((candidate.votes / snapshot.totalVotes) * 100) : 0,
    })),
    checks: {
      totalMatchesCandidateSum,
      hasOnChainSource,
      hasLiveLifecycle,
      hasMerkleRoot,
      hasKnownDemoMode,
      rootMatchesDeclaredMode: declaredModeMatchesRoot,
    },
    warnings,
  };
}

function isResultsAuditCandidateTally(value: unknown): value is ResultsAuditCandidateTally {
  return (
    isRecord(value) &&
    hasNonNegativeInteger(value, "candidateId") &&
    hasString(value, "name") &&
    hasNonNegativeInteger(value, "votes") &&
    hasNumber(value, "sharePercent")
  );
}

export function isResultsAuditSnapshot(value: unknown): value is ResultsAuditSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !hasString(value, "electionId") ||
    !hasString(value, "network") ||
    !hasString(value, "chainId") ||
    !hasString(value, "contractAddress") ||
    !hasString(value, "generatedAt") ||
    !hasString(value, "loadedAt") ||
    value.source !== "on-chain" ||
    !hasNonNegativeInteger(value, "electionState") ||
    !hasString(value, "electionStateName") ||
    !hasNonNegativeInteger(value, "latestBlock") ||
    !hasString(value, "merkleRoot") ||
    !isKnownDemoMode(value.demoMode) ||
    !hasString(value, "staticFixtureRoot") ||
    !hasString(value, "dynamicPreviewRoot") ||
    !hasBoolean(value, "rootMatchesStaticFixture") ||
    !hasBoolean(value, "rootMatchesDynamicPoseidon") ||
    !hasNonNegativeInteger(value, "totalVotes") ||
    !hasNullableNonNegativeInteger(value, "localApprovedVoters") ||
    !hasNullableNumber(value, "localDemoTurnout") ||
    !Array.isArray(value.candidateTallies) ||
    !isRecord(value.checks) ||
    !Array.isArray(value.warnings)
  ) {
    return false;
  }

  return (
    value.candidateTallies.every(isResultsAuditCandidateTally) &&
    typeof value.checks.totalMatchesCandidateSum === "boolean" &&
    typeof value.checks.hasOnChainSource === "boolean" &&
    typeof value.checks.hasLiveLifecycle === "boolean" &&
    typeof value.checks.hasMerkleRoot === "boolean" &&
    typeof value.checks.hasKnownDemoMode === "boolean" &&
    typeof value.checks.rootMatchesDeclaredMode === "boolean" &&
    value.warnings.every((warning) => typeof warning === "string")
  );
}

export function validateResultsAuditSnapshot(snapshot: unknown): ResultsAuditValidation {
  const errors: string[] = [];
  const forbiddenKeys = collectForbiddenAuditKeys(snapshot);

  if (forbiddenKeys.length > 0) {
    errors.push(`Audit JSON contains forbidden private fields: ${forbiddenKeys.join(", ")}.`);
  }

  if (
    isRecord(snapshot) &&
    (
      !("merkleRoot" in snapshot) ||
      !("demoMode" in snapshot) ||
      !("staticFixtureRoot" in snapshot) ||
      !("dynamicPreviewRoot" in snapshot)
    )
  ) {
    errors.push("Audit JSON is missing required demo mode/Merkle root metadata. Export a fresh Results audit JSON.");
  }

  if (!isResultsAuditSnapshot(snapshot)) {
    errors.push("Audit JSON is missing required results audit fields or has invalid field types.");

    return {
      isValid: false,
      errors,
      warnings: [],
    };
  }

  const warnings = [...snapshot.warnings];
  const candidateSum = snapshot.candidateTallies.reduce((sum, candidate) => sum + candidate.votes, 0);

  if (candidateSum !== snapshot.totalVotes) {
    errors.push("candidateTallies vote sum must equal totalVotes.");
  }

  if (!snapshot.checks.totalMatchesCandidateSum) {
    errors.push("totalMatchesCandidateSum check must be true.");
  }

  if (!snapshot.checks.hasOnChainSource || snapshot.source !== "on-chain") {
    errors.push("Audit export requires on-chain source.");
  }

  if (!snapshot.checks.hasLiveLifecycle) {
    errors.push("Audit export requires live lifecycle data.");
  }

  if (!snapshot.checks.hasMerkleRoot || !snapshot.merkleRoot.trim()) {
    errors.push("Audit export requires a public contract Merkle root.");
  }

  if (!snapshot.checks.hasKnownDemoMode || !DEMO_MODES.has(snapshot.demoMode)) {
    errors.push("Audit export requires a known demoMode.");
  }

  const declaredModeMatchesRoot = rootMatchesDeclaredMode({
    demoMode: snapshot.demoMode,
    merkleRoot: snapshot.merkleRoot,
    staticFixtureRoot: snapshot.staticFixtureRoot,
    dynamicPreviewRoot: snapshot.dynamicPreviewRoot,
    rootMatchesStaticFixture: snapshot.rootMatchesStaticFixture,
    rootMatchesDynamicPoseidon: snapshot.rootMatchesDynamicPoseidon,
  });

  if (!snapshot.checks.rootMatchesDeclaredMode || !declaredModeMatchesRoot) {
    errors.push("demoMode must match merkleRoot and root match flags.");
  }

  if (!Number.isInteger(snapshot.latestBlock) || snapshot.latestBlock < 0) {
    errors.push("latestBlock must be a non-negative integer.");
  }

  if (!Number.isInteger(snapshot.totalVotes) || snapshot.totalVotes < 0) {
    errors.push("totalVotes must be a non-negative integer.");
  }

  if (snapshot.localApprovedVoters !== null && (!Number.isInteger(snapshot.localApprovedVoters) || snapshot.localApprovedVoters < 0)) {
    errors.push("localApprovedVoters must be null or a non-negative integer.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
