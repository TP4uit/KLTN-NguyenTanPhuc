import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { network } from "hardhat";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = resolve(rootDir, "test", "fixtures", "registry", "registry.json");
const electionArtifactPath = resolve(
  rootDir,
  "artifacts",
  "contracts",
  "Election.sol",
  "Election.json",
);
const deploymentDir = resolve(rootDir, "deployments", "local");
const deploymentPath = resolve(deploymentDir, "election.json");
const frontendContractsDir = resolve(rootDir, "frontend", "src", "contracts");
const frontendMetadataPath = resolve(frontendContractsDir, "election.local.json");

function readJson(path: string, label: string) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Missing or invalid ${label}: ${path}`, { cause: error });
  }
}

const registry = readJson(registryPath, "registry fixture");
const electionArtifact = readJson(electionArtifactPath, "Election artifact");
const electionId = BigInt(process.env.LOCAL_ELECTION_ID ?? "1");
const merkleRoot = BigInt(registry.merkleRoot);
const connection = await network.create();
const { ethers } = connection;
const [deployer] = await ethers.getSigners();
const providerNetwork = await ethers.provider.getNetwork();

const verifier = await ethers.deployContract("Groth16Verifier");
await verifier.waitForDeployment();

const verifierAddress = await verifier.getAddress();
const election = await ethers.deployContract("Election", [
  verifierAddress,
  electionId,
  merkleRoot,
]);
await election.waitForDeployment();

const electionAddress = await election.getAddress();
const now = new Date().toISOString();
const publicInputOrder = [
  "nullifierHash",
  "candidateId",
  "electionId",
  "merkleRoot",
];

const metadata = {
  network: connection.networkName,
  networkType: connection.networkConfig.type,
  chainId: providerNetwork.chainId.toString(),
  deployer: deployer.address,
  verifierAddress,
  electionAddress,
  verifier: {
    address: verifierAddress,
  },
  election: {
    address: electionAddress,
  },
  electionId: electionId.toString(),
  merkleRoot: merkleRoot.toString(),
  candidateBounds: {
    min: 1,
    max: 4,
  },
  candidateIdRange: {
    min: 1,
    max: 4,
  },
  timestamp: now,
  publicInputOrder,
};

const frontendMetadata = {
  ...metadata,
  abi: electionArtifact.abi,
  abiSource: "artifacts/contracts/Election.sol/Election.json",
};

mkdirSync(deploymentDir, { recursive: true });
mkdirSync(frontendContractsDir, { recursive: true });
writeFileSync(deploymentPath, `${JSON.stringify(metadata, null, 2)}\n`);
writeFileSync(frontendMetadataPath, `${JSON.stringify(frontendMetadata, null, 2)}\n`);

console.log("Deployed local ZK voting contracts");
console.log(`  network: ${metadata.network}`);
console.log(`  chainId: ${metadata.chainId}`);
console.log(`  verifier: ${verifierAddress}`);
console.log(`  election: ${electionAddress}`);
console.log(`  electionId: ${metadata.electionId}`);
console.log(`  merkleRoot: ${metadata.merkleRoot}`);
console.log(`  deployment: ${deploymentPath}`);
console.log(`  frontend metadata: ${frontendMetadataPath}`);
