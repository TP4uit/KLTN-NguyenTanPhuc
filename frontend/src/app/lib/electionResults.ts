import type { Contract } from "ethers";
import { CANDIDATES, type CandidateMetadata } from "./candidates";
import { readLiveElectionLifecycle, type ElectionLifecycle } from "./localElection";

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
