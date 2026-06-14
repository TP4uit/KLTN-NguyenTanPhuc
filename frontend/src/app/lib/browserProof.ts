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
};

type RegistryFixture = {
  localDemoOnly: boolean;
  selectedVoterSecret: string;
  selectedNullifierHash: string;
  selectedElectionId: string;
  merkleRoot: string;
  pathElements: MerklePathElements;
  pathIndices: MerklePathIndices;
};

const DEFAULT_WASM_PATH = "/zk/vote.wasm";
const DEFAULT_ZKEY_PATH = "/zk/vote_final.zkey";

export const localRegistryFixture = registryFixture as RegistryFixture;

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

function parseSolidityCalldata(rawCalldata: string): SolidityVoteCalldata {
  const [a, b, c, input] = JSON.parse(`[${rawCalldata}]`) as [
    string[],
    string[][],
    string[],
    string[],
  ];

  return { a, b, c, input };
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
  const witnessInput = {
    nullifierHash: getLocalDemoNullifierHash(input),
    ...input,
  };
  const { proof, publicSignals } = await groth16.fullProve(
    witnessInput,
    options.wasmPath ?? DEFAULT_WASM_PATH,
    options.zkeyPath ?? DEFAULT_ZKEY_PATH,
  );
  const rawCalldata = await groth16.exportSolidityCallData(proof, publicSignals);

  return {
    proof,
    publicSignals,
    calldata: parseSolidityCalldata(rawCalldata),
  };
}
