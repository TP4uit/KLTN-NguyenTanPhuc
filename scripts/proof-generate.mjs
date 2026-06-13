import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { groth16, wtns } from "snarkjs";

import { createPoseidonHasher } from "./merkle-registry.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = resolve(
  rootDir,
  process.env.VOTE_FIXTURE_DIR ?? "test/fixtures/vote",
);
const wasmPath = resolve(rootDir, "circuits", "vote_js", "vote.wasm");
const zkeyPath = resolve(rootDir, "vote_final.zkey");
const registryPath = resolve(
  rootDir,
  process.env.REGISTRY_FIXTURE_PATH ?? "test/fixtures/registry/registry.json",
);
const witnessPath = resolve(fixtureDir, "witness.wtns");
const inputPath = resolve(fixtureDir, "input.json");
const proofPath = resolve(fixtureDir, "proof.json");
const publicPath = resolve(fixtureDir, "public.json");

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const secretKey = process.env.VOTE_SECRET_KEY ?? registry.selectedVoterSecret;
const candidateId = process.env.VOTE_CANDIDATE_ID ?? "1";
const electionId = process.env.VOTE_ELECTION_ID ?? "1";
const merkleRoot = process.env.VOTE_MERKLE_ROOT ?? registry.merkleRoot;
const pathElements = registry.pathElements;
const pathIndices = registry.pathIndices;

mkdirSync(fixtureDir, { recursive: true });

const hasher = await createPoseidonHasher();
const nullifierHash = hasher.hash([secretKey, electionId]);
const input = {
  // Public input order: nullifierHash, candidateId, electionId, merkleRoot.
  nullifierHash,
  candidateId,
  electionId,
  merkleRoot,
  secretKey,
  pathElements,
  pathIndices,
};

writeFileSync(inputPath, `${JSON.stringify(input, null, 2)}\n`);

await wtns.calculate(input, wasmPath, witnessPath);
const { proof, publicSignals } = await groth16.prove(zkeyPath, witnessPath);

writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(publicPath, `${JSON.stringify(publicSignals, null, 2)}\n`);

console.log("Generated proof fixture");
console.log(`  input: ${inputPath}`);
console.log(`  witness: ${witnessPath}`);
console.log(`  proof: ${proofPath}`);
console.log(`  public signals: ${publicPath}`);
console.log(`  nullifierHash: ${nullifierHash}`);
console.log(`  candidateId: ${candidateId}`);
console.log(`  electionId: ${electionId}`);
console.log(`  merkleRoot: ${merkleRoot}`);

process.exit(0);
