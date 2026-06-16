import { groth16 } from "snarkjs";
import registryFixture from "../../contracts/registry.local.json";

export type MerklePathElements = [string, string, string];
export type MerklePathIndices = [number, number, number];

export type BrowserVoteProofInput = {
  secretKey: string;
  candidateId: string;
  electionId: string;
  merkleRoot: string;
  pathElements: MerklePathElements;
  pathIndices: MerklePathIndices;
};

export type SolidityVoteCalldata = {
  a: string[];
  b: string[][];
  c: string[];
  input: string[];
};

export type BrowserVoteProofResult = {
  proof: unknown;
  publicSignals: string[];
  calldata: SolidityVoteCalldata;
  timingMs: number;
};

type RegistryFixture = {
  localDemoOnly: boolean;
  selectedVoterSecret: string;
  selectedIdentityCommitment: string;
  selectedNullifierHash: string;
  selectedElectionId: string;
  merkleRoot: string;
  pathElements: MerklePathElements;
  pathIndices: MerklePathIndices;
};

const DEFAULT_WASM_PATH = "/zk/vote.wasm";
const DEFAULT_ZKEY_PATH = "/zk/vote_final.zkey";

export const localRegistryFixture = registryFixture as RegistryFixture;

export type LocalRegistryFixtureIdentity = {
  selectedVoterSecret: string;
  selectedIdentityCommitment: string;
  selectedElectionId: string;
  merkleRoot: string;
};

export function getLocalRegistryFixtureIdentity(): LocalRegistryFixtureIdentity {
  // Local demo fixture compatibility only; this is not production registration or registry logic.
  return {
    selectedVoterSecret: localRegistryFixture.selectedVoterSecret,
    selectedIdentityCommitment: localRegistryFixture.selectedIdentityCommitment,
    selectedElectionId: localRegistryFixture.selectedElectionId,
    merkleRoot: localRegistryFixture.merkleRoot,
  };
}

function getLocalDemoNullifierHash(input: BrowserVoteProofInput) {
  if (
    input.secretKey !== localRegistryFixture.selectedVoterSecret ||
    input.electionId !== localRegistryFixture.selectedElectionId
  ) {
    throw new Error(
      "This browser proof scaffold only includes the precomputed local demo nullifier. Add browser Poseidon derivation before using other secrets or elections.",
    );
  }

  return localRegistryFixture.selectedNullifierHash;
}

function normalizeField(value: string) {
  return BigInt(value).toString();
}

function parseSolidityCalldata(rawCalldata: string): SolidityVoteCalldata {
  const [a, b, c, input] = JSON.parse(`[${rawCalldata}]`) as [
    string[],
    string[][],
    string[],
    string[],
  ];

  return { a, b, c, input };
}

function validatePublicSignals(
  calldata: SolidityVoteCalldata,
  publicSignals: string[],
  expected: {
    nullifierHash: string;
    candidateId: string;
    electionId: string;
    merkleRoot: string;
  },
) {
  if (calldata.input.length !== 4 || publicSignals.length !== 4) {
    throw new Error("Generated proof must have 4 public inputs: nullifierHash, candidateId, electionId, merkleRoot.");
  }

  const expectedOrder = [
    expected.nullifierHash,
    expected.candidateId,
    expected.electionId,
    expected.merkleRoot,
  ];

  expectedOrder.forEach((expectedValue, index) => {
    const calldataValue = calldata.input[index];
    const signalValue = publicSignals[index];

    if (
      normalizeField(calldataValue) !== normalizeField(expectedValue) ||
      normalizeField(signalValue) !== normalizeField(expectedValue)
    ) {
      throw new Error(
        `Generated public input[${index}] mismatch. Expected ${normalizeField(expectedValue)}, got calldata ${normalizeField(calldataValue)} and signal ${normalizeField(signalValue)}.`,
      );
    }
  });
}

export function buildLocalDemoProofInput(candidateId: string, electionId: string): BrowserVoteProofInput {
  return {
    secretKey: localRegistryFixture.selectedVoterSecret,
    candidateId,
    electionId,
    merkleRoot: localRegistryFixture.merkleRoot,
    pathElements: localRegistryFixture.pathElements,
    pathIndices: localRegistryFixture.pathIndices,
  };
}

export async function generateVoteProof(
  input: BrowserVoteProofInput,
  options: {
    wasmPath?: string;
    zkeyPath?: string;
  } = {},
): Promise<BrowserVoteProofResult> {
  const startedAt = performance.now();
  const nullifierHash = getLocalDemoNullifierHash(input);
  const witnessInput = {
    nullifierHash,
    ...input,
  };
  const { proof, publicSignals } = await groth16.fullProve(
    witnessInput,
    options.wasmPath ?? DEFAULT_WASM_PATH,
    options.zkeyPath ?? DEFAULT_ZKEY_PATH,
  );
  const rawCalldata = await groth16.exportSolidityCallData(proof, publicSignals);
  const calldata = parseSolidityCalldata(rawCalldata);

  validatePublicSignals(calldata, publicSignals, {
    nullifierHash,
    candidateId: input.candidateId,
    electionId: input.electionId,
    merkleRoot: input.merkleRoot,
  });

  return {
    proof,
    publicSignals,
    calldata,
    timingMs: Math.round(performance.now() - startedAt),
  };
}
