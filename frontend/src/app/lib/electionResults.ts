import type { Contract } from "ethers";
import { CANDIDATES, type CandidateMetadata } from "./candidates";
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
  totalVotes: number;
  localApprovedVoters: number | null;
  localDemoTurnout: number | null;
  candidateTallies: ResultsAuditCandidateTally[];
  checks: {
    totalMatchesCandidateSum: boolean;
    hasOnChainSource: boolean;
    hasLiveLifecycle: boolean;
  };
  warnings: string[];
};

export type ResultsAuditValidation = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

type BlockProvider = {
  getBlockNumber(): Promise<number>;
};

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

export async function readOnChainElectionResults(
  contract: Contract,
  provider: BlockProvider,
  candidates = CANDIDATES,
): Promise<ElectionResultsSnapshot> {
  const [counts, lifecycle, latestBlock] = await Promise.all([
    Promise.all(candidates.map((candidate) => contract.getVotes(candidate.candidateId))),
    readLiveElectionLifecycle(contract),
    provider.getBlockNumber(),
  ]);

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
    },
    warnings,
  };
}

export function validateResultsAuditSnapshot(snapshot: ResultsAuditSnapshot): ResultsAuditValidation {
  const errors: string[] = [];
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
