import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { network } from "hardhat";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const deploymentPath = resolve(rootDir, "deployments", "local", "election.json");
const proofPath = resolve(rootDir, "test", "fixtures", "vote", "proof.json");
const calldataPath = resolve(rootDir, "test", "fixtures", "vote", "calldata.json");

function readRequiredJson(path: string, label: string) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Invalid ${label}: ${path}`, { cause: error });
  }
}

function publicSignalToBigInt(value: string): bigint {
  return BigInt(value);
}

const deployment = readRequiredJson(deploymentPath, "local deployment JSON");
readRequiredJson(proofPath, "proof fixture JSON");
const calldata = readRequiredJson(calldataPath, "proof calldata fixture");

const calldataNullifierHash = publicSignalToBigInt(calldata.input[0]);
const calldataCandidateId = publicSignalToBigInt(calldata.input[1]);
const calldataElectionId = publicSignalToBigInt(calldata.input[2]);
const calldataMerkleRoot = publicSignalToBigInt(calldata.input[3]);
const deploymentElectionId = BigInt(deployment.electionId);
const deploymentMerkleRoot = BigInt(deployment.merkleRoot);

if (deploymentElectionId !== calldataElectionId) {
  throw new Error(
    `Deployment electionId ${deploymentElectionId} does not match calldata input[2] ${calldataElectionId}`,
  );
}

if (deploymentMerkleRoot !== calldataMerkleRoot) {
  throw new Error(
    `Deployment merkleRoot ${deploymentMerkleRoot} does not match calldata input[3] ${calldataMerkleRoot}`,
  );
}

const { ethers } = await network.create();

async function recreateEphemeralDeploymentIfNeeded() {
  const currentCode = await ethers.provider.getCode(deployment.election.address);

  if (currentCode !== "0x") {
    return;
  }

  const verifier = await ethers.deployContract("Groth16Verifier");
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();

  const election = await ethers.deployContract("Election", [
    verifierAddress,
    deploymentElectionId,
    deploymentMerkleRoot,
  ]);
  await election.waitForDeployment();
  const electionAddress = await election.getAddress();

  if (verifierAddress.toLowerCase() !== deployment.verifier.address.toLowerCase()) {
    throw new Error(
      `Recreated verifier address ${verifierAddress} does not match deployment JSON ${deployment.verifier.address}`,
    );
  }

  if (electionAddress.toLowerCase() !== deployment.election.address.toLowerCase()) {
    throw new Error(
      `Recreated election address ${electionAddress} does not match deployment JSON ${deployment.election.address}`,
    );
  }
}

await recreateEphemeralDeploymentIfNeeded();

const election = await ethers.getContractAt("Election", deployment.election.address);
const onChainElectionId = await election.electionId();
const onChainMerkleRoot = await election.merkleRoot();

if (onChainElectionId !== deploymentElectionId) {
  throw new Error(
    `On-chain electionId ${onChainElectionId} does not match deployment JSON ${deploymentElectionId}`,
  );
}

if (onChainMerkleRoot !== deploymentMerkleRoot) {
  throw new Error(
    `On-chain merkleRoot ${onChainMerkleRoot} does not match deployment JSON ${deploymentMerkleRoot}`,
  );
}

const tx = await election.castVote(
  calldata.a,
  calldata.b,
  calldata.c,
  calldata.input,
);
const receipt = await tx.wait();
const votes = await election.getVotes(calldataCandidateId);

console.log("Submitted local vote");
console.log(`  txHash: ${receipt?.hash ?? tx.hash}`);
console.log(`  gasUsed: ${receipt?.gasUsed?.toString() ?? "unknown"}`);
console.log(`  candidateId: ${calldataCandidateId}`);
console.log(`  nullifierHash: ${calldataNullifierHash}`);
console.log(`  updatedVotes: ${votes}`);
