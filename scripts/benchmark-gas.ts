import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { network } from "hardhat";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = resolve(rootDir, "reports", "evidence");
const reportPath = resolve(evidenceDir, "gas-benchmark.json");
const calldataPath = resolve(rootDir, "test", "fixtures", "vote", "calldata.json");
const registryPath = resolve(rootDir, "test", "fixtures", "registry", "registry.json");

type VoteCalldata = {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  input: [string, string, string, string];
};

function readJson(path: string, label: string) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Missing or invalid ${label}: ${path}`, { cause: error });
  }
}

function stringifyJson(value: unknown) {
  return JSON.stringify(
    value,
    (_key, nestedValue) =>
      typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue,
    2,
  );
}

function publicSignal(value: bigint) {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function readableRevertReason(reason: string) {
  const quotedReason = reason.match(/reverted with reason string '([^']+)'/);
  if (quotedReason?.[1] !== undefined) {
    return quotedReason[1];
  }

  return reason;
}

function replaceInput(
  calldata: VoteCalldata,
  index: number,
  value: bigint,
): [string, string, string, string] {
  const next = [...calldata.input] as [string, string, string, string];
  next[index] = publicSignal(value);
  return next;
}

function errorSummary(error: unknown) {
  const typed = error as {
    shortMessage?: string;
    reason?: string;
    message?: string;
    receipt?: {
      gasUsed?: bigint;
      hash?: string;
      status?: number;
    };
  };

  const reason = typed.reason ?? typed.shortMessage ?? typed.message ?? "unknown error";

  return {
    reason: readableRevertReason(reason),
    receipt: typed.receipt === undefined
      ? null
      : {
          hash: typed.receipt.hash,
          status: typed.receipt.status,
          gasUsed: typed.receipt.gasUsed?.toString(),
        },
  };
}

async function measureRevert(label: string, action: () => Promise<unknown>) {
  try {
    await action();
    return {
      label,
      reverted: false,
      reason: null,
      gasUsed: null,
      txHash: null,
    };
  } catch (error) {
    const summary = errorSummary(error);
    return {
      label,
      reverted: true,
      reason: summary.reason,
      gasUsed: summary.receipt?.gasUsed ?? null,
      txHash: summary.receipt?.hash ?? null,
      receiptStatus: summary.receipt?.status ?? null,
    };
  }
}

const calldata = readJson(calldataPath, "vote calldata fixture") as VoteCalldata;
const registry = readJson(registryPath, "registry fixture");
const electionId = BigInt(calldata.input[2]);
const merkleRoot = BigInt(registry.merkleRoot);
const candidateId = BigInt(calldata.input[1]);
const nullifierHash = BigInt(calldata.input[0]);
const { ethers } = await network.create();
const [deployer] = await ethers.getSigners();

async function deployBenchmarkElection() {
  const verifier = await ethers.deployContract("Groth16Verifier");
  await verifier.waitForDeployment();
  const verifierReceipt = await verifier.deploymentTransaction()?.wait();

  const election = await ethers.deployContract("Election", [
    await verifier.getAddress(),
    electionId,
    merkleRoot,
  ]);
  await election.waitForDeployment();
  const electionReceipt = await election.deploymentTransaction()?.wait();

  return { verifier, verifierReceipt, election, electionReceipt };
}

const { verifier, verifierReceipt, election, electionReceipt } =
  await deployBenchmarkElection();

const validTx = await election.castVote(
  calldata.a,
  calldata.b,
  calldata.c,
  calldata.input,
);
const validReceipt = await validTx.wait();

const duplicate = await measureRevert("duplicate nullifier", async () =>
  election.castVote(calldata.a, calldata.b, calldata.c, calldata.input, {
    gasLimit: 5_000_000,
  }),
);

const invalidCandidate = await measureRevert("invalid candidate", async () =>
  election.castVote(
    calldata.a,
    calldata.b,
    calldata.c,
    replaceInput(calldata, 1, 0n),
    { gasLimit: 5_000_000 },
  ),
);

const invalidMerkleRoot = await measureRevert("invalid Merkle root", async () =>
  election.castVote(
    calldata.a,
    calldata.b,
    calldata.c,
    replaceInput(calldata, 3, merkleRoot + 1n),
    { gasLimit: 5_000_000 },
  ),
);

const { election: invalidProofElection } = await deployBenchmarkElection();
const invalidProof = await measureRevert("invalid proof", async () =>
  invalidProofElection.castVote(
    calldata.a,
    calldata.b,
    calldata.c,
    replaceInput(calldata, 1, 2n),
    { gasLimit: 5_000_000 },
  ),
);

const report = {
  kind: "gas-benchmark",
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    hardhatNetwork: "default",
  },
  inputs: {
    calldata: "test/fixtures/vote/calldata.json",
    registry: "test/fixtures/registry/registry.json",
    electionId: electionId.toString(),
    merkleRoot: merkleRoot.toString(),
    candidateId: candidateId.toString(),
    nullifierHash: nullifierHash.toString(),
  },
  deployer: deployer.address,
  deployments: {
    verifier: {
      address: await verifier.getAddress(),
      txHash: verifierReceipt?.hash,
      gasUsed: verifierReceipt?.gasUsed?.toString(),
    },
    election: {
      address: await election.getAddress(),
      txHash: electionReceipt?.hash,
      gasUsed: electionReceipt?.gasUsed?.toString(),
    },
  },
  transactions: {
    validCastVote: {
      txHash: validReceipt?.hash,
      gasUsed: validReceipt?.gasUsed?.toString(),
      candidateId: candidateId.toString(),
      updatedVotes: (await election.getVotes(candidateId)).toString(),
    },
    rejections: {
      duplicate,
      invalidCandidate,
      invalidMerkleRoot,
      invalidProof,
    },
  },
  passed:
    verifierReceipt?.gasUsed !== undefined &&
    electionReceipt?.gasUsed !== undefined &&
    validReceipt?.gasUsed !== undefined &&
    duplicate.reverted &&
    invalidCandidate.reverted &&
    invalidMerkleRoot.reverted &&
    invalidProof.reverted,
};

mkdirSync(evidenceDir, { recursive: true });
writeFileSync(reportPath, `${stringifyJson(report)}\n`);

if (!report.passed) {
  throw new Error(`Gas benchmark failed. See ${reportPath}`);
}

console.log(`Gas benchmark written: ${reportPath}`);
