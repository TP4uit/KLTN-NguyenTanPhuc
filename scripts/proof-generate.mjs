import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildPoseidon } from "circomlibjs";
import { groth16, wtns } from "snarkjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = resolve(rootDir, "test", "fixtures", "vote");
const wasmPath = resolve(rootDir, "circuits", "vote_js", "vote.wasm");
const zkeyPath = resolve(rootDir, "vote_final.zkey");
const witnessPath = resolve(fixtureDir, "witness.wtns");
const inputPath = resolve(fixtureDir, "input.json");
const proofPath = resolve(fixtureDir, "proof.json");
const publicPath = resolve(fixtureDir, "public.json");

const secretKey = process.env.VOTE_SECRET_KEY ?? "123456789";
const candidateId = process.env.VOTE_CANDIDATE_ID ?? "1";

mkdirSync(fixtureDir, { recursive: true });

const poseidon = await buildPoseidon();
const nullifierHash = poseidon.F.toString(poseidon([BigInt(secretKey)]));
const input = {
  nullifierHash,
  candidateId,
  secretKey,
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

process.exit(0);
