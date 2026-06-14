import { resolve } from "node:path";

import { groth16 } from "snarkjs";

import {
  evidenceDir,
  normalizeInputArray,
  publicInputOrder,
  readJson,
  reportBase,
  rootDir,
  writeJson,
} from "./evidence-lib.mjs";

const verificationKeyPath = resolve(rootDir, "verification_key.json");
const proofPath = resolve(rootDir, "test", "fixtures", "vote", "proof.json");
const publicPath = resolve(rootDir, "test", "fixtures", "vote", "public.json");
const inputPath = resolve(rootDir, "test", "fixtures", "vote", "input.json");
const reportPath = resolve(evidenceDir, "audit-proof.json");

const verificationKey = readJson(verificationKeyPath, "verification key");
const proof = readJson(proofPath, "proof fixture");
const publicSignals = readJson(publicPath, "public signals fixture");
const proofInput = readJson(inputPath, "proof input fixture");

const expectedPublicSignals = publicInputOrder.map((key) => proofInput[key]);
const normalizedPublicSignals = normalizeInputArray(publicSignals);
const normalizedExpected = normalizeInputArray(expectedPublicSignals);
const orderMatches = normalizedPublicSignals.every(
  (value, index) => value === normalizedExpected[index],
);
const proofValid = await groth16.verify(verificationKey, publicSignals, proof);

const report = {
  ...reportBase("audit-proof"),
  inputs: {
    verificationKey: "verification_key.json",
    proof: "test/fixtures/vote/proof.json",
    publicSignals: "test/fixtures/vote/public.json",
    proofInput: "test/fixtures/vote/input.json",
  },
  publicInputOrder,
  publicSignals: normalizedPublicSignals,
  expectedPublicSignals: normalizedExpected,
  checks: {
    proofValid,
    publicSignalCount: publicSignals.length,
    expectedPublicSignalCount: publicInputOrder.length,
    publicSignalOrderMatchesInputFixture: orderMatches,
  },
  passed: proofValid && publicSignals.length === publicInputOrder.length && orderMatches,
};

writeJson(reportPath, report);

if (!report.passed) {
  throw new Error(`Proof audit failed. See ${reportPath}`);
}

console.log(`Proof audit passed: ${reportPath}`);
process.exit(0);
