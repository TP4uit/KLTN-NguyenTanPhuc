import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { groth16, wtns } from "snarkjs";

import { createPoseidonHasher } from "./merkle-registry.mjs";
import {
  evidenceDir,
  fileSize,
  parseR1csInfo,
  publicInputOrder,
  readJson,
  reportBase,
  rootDir,
  runSnarkjs,
  writeJson,
} from "./evidence-lib.mjs";

const registryPath = resolve(rootDir, "test", "fixtures", "registry", "registry.json");
const wasmPath = resolve(rootDir, "circuits", "vote_js", "vote.wasm");
const zkeyPath = resolve(rootDir, "vote_final.zkey");
const r1csPath = resolve(rootDir, "circuits", "vote.r1cs");
const proofPath = resolve(rootDir, "test", "fixtures", "vote", "proof.json");
const publicPath = resolve(rootDir, "test", "fixtures", "vote", "public.json");
const calldataPath = resolve(rootDir, "test", "fixtures", "vote", "calldata.json");
const reportPath = resolve(evidenceDir, "proof-benchmark.json");

function elapsedMs(startedAt) {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
}

const benchmarkStartedAt = process.hrtime.bigint();
const registry = readJson(registryPath, "registry fixture");
const hasher = await createPoseidonHasher();
const proofInput = {
  nullifierHash: hasher.hash([registry.selectedVoterSecret, "1"]),
  candidateId: "1",
  electionId: "1",
  merkleRoot: registry.merkleRoot,
  secretKey: registry.selectedVoterSecret,
  pathElements: registry.pathElements,
  pathIndices: registry.pathIndices,
};
const tempDir = mkdtempSync(resolve(tmpdir(), "kltn-proof-benchmark-"));
const witnessPath = resolve(tempDir, "witness.wtns");

let witnessMs = 0;
let provingMs = 0;
let calldataExportMs = 0;
let proof;
let publicSignals;
let rawCalldata;

try {
  let stepStartedAt = process.hrtime.bigint();
  await wtns.calculate(proofInput, wasmPath, witnessPath);
  witnessMs = elapsedMs(stepStartedAt);

  stepStartedAt = process.hrtime.bigint();
  ({ proof, publicSignals } = await groth16.prove(zkeyPath, witnessPath));
  provingMs = elapsedMs(stepStartedAt);

  stepStartedAt = process.hrtime.bigint();
  rawCalldata = await groth16.exportSolidityCallData(proof, publicSignals);
  calldataExportMs = elapsedMs(stepStartedAt);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

const r1csInfoRaw = runSnarkjs(["r1cs", "info", r1csPath]);
const report = {
  ...reportBase("proof-benchmark"),
  inputs: {
    registry: "test/fixtures/registry/registry.json",
    r1cs: "circuits/vote.r1cs",
    wasm: "circuits/vote_js/vote.wasm",
    zkey: "vote_final.zkey",
  },
  publicInputOrder,
  circuit: {
    r1csInfo: parseR1csInfo(r1csInfoRaw),
    r1csInfoRaw,
  },
  artifactSizes: {
    r1cs: fileSize(r1csPath),
    wasm: fileSize(wasmPath),
    zkey: fileSize(zkeyPath),
    verificationKey: fileSize(resolve(rootDir, "verification_key.json")),
    verifierSolidity: fileSize(resolve(rootDir, "contracts", "Verifier.sol")),
    proofJson: fileSize(proofPath),
    publicSignalsJson: fileSize(publicPath),
    calldataJson: fileSize(calldataPath),
  },
  proofWorkflow: {
    witnessGenerationMs: Math.round(witnessMs),
    groth16ProvingMs: Math.round(provingMs),
    calldataExportMs: Math.round(calldataExportMs),
    totalProofWorkflowMs: Math.round(witnessMs + provingMs + calldataExportMs),
    totalMeasuredMs: Math.round(elapsedMs(benchmarkStartedAt)),
    publicSignals,
    calldataLengthBytes: Buffer.byteLength(rawCalldata, "utf8"),
  },
  passed: true,
};

writeJson(reportPath, report);
console.log(`Proof benchmark written: ${reportPath}`);
process.exit(0);
