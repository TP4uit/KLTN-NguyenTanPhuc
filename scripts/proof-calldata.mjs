import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { groth16 } from "snarkjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = resolve(rootDir, "test", "fixtures", "vote");
const proofPath = resolve(fixtureDir, "proof.json");
const publicPath = resolve(fixtureDir, "public.json");
const calldataPath = resolve(fixtureDir, "calldata.json");
const rawCalldataPath = resolve(fixtureDir, "calldata.txt");

if (!existsSync(proofPath) || !existsSync(publicPath)) {
  throw new Error("Missing proof fixture. Run `npm run proof:generate` first.");
}

const proof = JSON.parse(readFileSync(proofPath, "utf8"));
const publicSignals = JSON.parse(readFileSync(publicPath, "utf8"));
const rawCalldata = await groth16.exportSolidityCallData(proof, publicSignals);
const [a, b, c, input] = JSON.parse(`[${rawCalldata}]`);

const calldata = {
  a,
  b,
  c,
  input,
  publicSignals,
  nullifierHash: input[0],
  candidateId: input[1],
  electionId: input[2],
};

writeFileSync(rawCalldataPath, `${rawCalldata}\n`);
writeFileSync(calldataPath, `${JSON.stringify(calldata, null, 2)}\n`);

console.log("Exported Solidity calldata fixture");
console.log(`  calldata: ${calldataPath}`);
console.log(`  raw calldata: ${rawCalldataPath}`);
console.log(`  input[0] nullifierHash: ${input[0]}`);
console.log(`  input[1] candidateId: ${input[1]}`);
console.log(`  input[2] electionId: ${input[2]}`);
