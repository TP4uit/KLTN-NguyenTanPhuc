import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = resolve(rootDir, "test", "fixtures", "registry", "registry.json");
const voteInputPath = resolve(rootDir, "test", "fixtures", "vote", "input.json");
const voteWasmPath = resolve(rootDir, "circuits", "vote_js", "vote.wasm");
const voteZkeyPath = resolve(rootDir, "vote_final.zkey");
const frontendContractsDir = resolve(rootDir, "frontend", "src", "contracts");
const frontendPublicZkDir = resolve(rootDir, "frontend", "public", "zk");
const frontendRegistryPath = resolve(frontendContractsDir, "registry.local.json");
const frontendWasmPath = resolve(frontendPublicZkDir, "vote.wasm");
const frontendZkeyPath = resolve(frontendPublicZkDir, "vote_final.zkey");

function readRequiredJson(path, label) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Invalid ${label}: ${path}`, { cause: error });
  }
}

function copyRequiredFile(source, destination, label) {
  if (!existsSync(source)) {
    throw new Error(`Missing ${label}: ${source}`);
  }

  copyFileSync(source, destination);
}

const registry = readRequiredJson(registryPath, "registry fixture");
const voteInput = readRequiredJson(voteInputPath, "vote input fixture");
const frontendRegistry = {
  localDemoOnly: true,
  warning:
    "Local demo fixture only. Do not use this voter secret or registry material in production.",
  treeDepth: registry.treeDepth,
  hashFunction: registry.hashFunction,
  identityCommitmentFormula: registry.identityCommitmentFormula,
  selectedVoterIndex: registry.selectedVoterIndex,
  selectedVoterSecret: registry.selectedVoterSecret,
  selectedIdentityCommitment: registry.selectedIdentityCommitment,
  selectedNullifierHash: voteInput.nullifierHash,
  selectedElectionId: voteInput.electionId,
  merkleRoot: registry.merkleRoot,
  pathElements: registry.pathElements,
  pathIndices: registry.pathIndices,
};

mkdirSync(frontendContractsDir, { recursive: true });
mkdirSync(frontendPublicZkDir, { recursive: true });
writeFileSync(frontendRegistryPath, `${JSON.stringify(frontendRegistry, null, 2)}\n`);
copyRequiredFile(voteWasmPath, frontendWasmPath, "vote WASM");
copyRequiredFile(voteZkeyPath, frontendZkeyPath, "vote zkey");

console.log("Synced frontend ZK fixtures");
console.log(`  registry: ${frontendRegistryPath}`);
console.log(`  wasm: ${frontendWasmPath}`);
console.log(`  zkey: ${frontendZkeyPath}`);
