import { runDynamicBrowserProofCheck } from "./dynamicBrowserProofCheck";
import { getDynamicVoteReadiness } from "./dynamicVoteReadiness";
import type { ElectionLifecycle } from "./localElection";
import type { VoterRegistration } from "./voterRegistrationModel";

type DynamicVoteTransaction = {
  hash?: string;
  wait(): Promise<{ hash?: string } | null | undefined>;
};

export type DynamicVoteContract = {
  castVote(
    a: string[],
    b: string[][],
    c: string[],
    input: string[],
  ): Promise<DynamicVoteTransaction>;
};

export type DynamicVoteSubmitInput = {
  registration: VoterRegistration | null;
  candidateId: string | number;
  contract: DynamicVoteContract;
  lifecycle: ElectionLifecycle;
  contractRoot: string | null;
  hasVotedInSession: boolean;
};

export type DynamicVoteSubmitResult = {
  txHash: string;
  timingMs: number;
  candidateId: string;
  electionId: string;
  merkleRoot: string;
  nullifierHash: string;
};

function normalizeRoot(root?: string | null) {
  return root?.trim() || null;
}

function normalizeField(value: string) {
  return BigInt(value).toString();
}

export async function submitDynamicVote({
  registration,
  candidateId,
  contract,
  lifecycle,
  contractRoot,
  hasVotedInSession,
}: DynamicVoteSubmitInput): Promise<DynamicVoteSubmitResult> {
  if (!registration) {
    throw new Error("Dynamic submit requires an approved voter registration.");
  }

  if (lifecycle.electionState !== 1) {
    throw new Error(
      `Election is ${lifecycle.electionStateName}. Dynamic submit is only available while the election is Open.`,
    );
  }

  const readiness = await getDynamicVoteReadiness(registration, lifecycle, contractRoot, {
    hasVotedInSession,
  });

  if (!readiness.isReady) {
    throw new Error(`Dynamic submit blocked: ${readiness.reasons.join(" ")}`);
  }

  const normalizedContractRoot = normalizeRoot(readiness.contractRoot);
  const normalizedDynamicRoot = normalizeRoot(readiness.dynamicPreviewRoot);

  if (!normalizedContractRoot || !normalizedDynamicRoot || normalizedContractRoot !== normalizedDynamicRoot) {
    throw new Error("Dynamic submit blocked: contract Merkle root does not match the dynamic preview root.");
  }

  const proofCheck = await runDynamicBrowserProofCheck(registration.id, candidateId);
  const calldataRoot = proofCheck.calldata.input[3];

  if (normalizeField(calldataRoot) !== normalizeField(normalizedDynamicRoot)) {
    throw new Error("Dynamic submit blocked: generated calldata root does not match the dynamic preview root.");
  }

  const tx = await contract.castVote(
    proofCheck.calldata.a,
    proofCheck.calldata.b,
    proofCheck.calldata.c,
    proofCheck.calldata.input,
  );
  const receipt = await tx.wait();

  return {
    txHash: receipt?.hash ?? tx.hash ?? "",
    timingMs: proofCheck.timingMs,
    candidateId: proofCheck.candidateId,
    electionId: proofCheck.electionId,
    merkleRoot: proofCheck.merkleRootPreview,
    nullifierHash: proofCheck.nullifierHash,
  };
}
