import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  evidenceDir,
  normalizeInputArray,
  publicInputOrder,
  readJson,
  reportBase,
  rootDir,
  writeJson,
} from "./evidence-lib.mjs";

const calldataPath = resolve(rootDir, "test", "fixtures", "vote", "calldata.json");
const publicPath = resolve(rootDir, "test", "fixtures", "vote", "public.json");
const inputPath = resolve(rootDir, "test", "fixtures", "vote", "input.json");
const registryPath = resolve(rootDir, "test", "fixtures", "registry", "registry.json");
const deploymentPath = resolve(rootDir, "deployments", "local", "election.json");
const reportPath = resolve(evidenceDir, "audit-calldata.json");

const calldata = readJson(calldataPath, "Solidity calldata fixture");
const publicSignals = readJson(publicPath, "public signals fixture");
const proofInput = readJson(inputPath, "proof input fixture");
const registry = readJson(registryPath, "registry fixture");
const deployment = existsSync(deploymentPath)
  ? readJson(deploymentPath, "local deployment metadata")
  : null;

const normalizedCalldataInput = normalizeInputArray(calldata.input);
const normalizedPublicSignals = normalizeInputArray(publicSignals);
const normalizedCalldataPublicSignals = normalizeInputArray(calldata.publicSignals);
const normalizedExpectedFromInput = normalizeInputArray(
  publicInputOrder.map((key) => proofInput[key]),
);

const checks = {
  calldataHasProofArrays:
    Array.isArray(calldata.a) &&
    calldata.a.length === 2 &&
    Array.isArray(calldata.b) &&
    calldata.b.length === 2 &&
    Array.isArray(calldata.c) &&
    calldata.c.length === 2,
  calldataInputCount: calldata.input.length,
  calldataInputMatchesPublicSignals: normalizedCalldataInput.every(
    (value, index) => value === normalizedPublicSignals[index],
  ),
  calldataPublicSignalsMatchesPublicJson: normalizedCalldataPublicSignals.every(
    (value, index) => value === normalizedPublicSignals[index],
  ),
  calldataInputMatchesProofInputOrder: normalizedCalldataInput.every(
    (value, index) => value === normalizedExpectedFromInput[index],
  ),
  candidateMatchesProofInput:
    normalizedCalldataInput[1] === BigInt(proofInput.candidateId).toString(),
  electionMatchesProofInput:
    normalizedCalldataInput[2] === BigInt(proofInput.electionId).toString(),
  merkleRootMatchesRegistry:
    normalizedCalldataInput[3] === BigInt(registry.merkleRoot).toString(),
  deploymentAvailable: deployment !== null,
  electionMatchesDeployment:
    deployment === null ||
    normalizedCalldataInput[2] === BigInt(deployment.electionId).toString(),
  merkleRootMatchesDeployment:
    deployment === null ||
    normalizedCalldataInput[3] === BigInt(deployment.merkleRoot).toString(),
};

const report = {
  ...reportBase("audit-calldata"),
  inputs: {
    calldata: "test/fixtures/vote/calldata.json",
    publicSignals: "test/fixtures/vote/public.json",
    proofInput: "test/fixtures/vote/input.json",
    registry: "test/fixtures/registry/registry.json",
    deployment: deployment === null ? null : "deployments/local/election.json",
  },
  publicInputOrder,
  calldataInput: normalizedCalldataInput,
  publicSignals: normalizedPublicSignals,
  expectedFromProofInput: normalizedExpectedFromInput,
  deployment: deployment === null
    ? null
    : {
        network: deployment.network,
        chainId: deployment.chainId,
        electionId: deployment.electionId,
        merkleRoot: deployment.merkleRoot,
      },
  checks,
  passed:
    checks.calldataHasProofArrays &&
    checks.calldataInputCount === publicInputOrder.length &&
    checks.calldataInputMatchesPublicSignals &&
    checks.calldataPublicSignalsMatchesPublicJson &&
    checks.calldataInputMatchesProofInputOrder &&
    checks.candidateMatchesProofInput &&
    checks.electionMatchesProofInput &&
    checks.merkleRootMatchesRegistry &&
    checks.electionMatchesDeployment &&
    checks.merkleRootMatchesDeployment,
};

writeJson(reportPath, report);

if (!report.passed) {
  throw new Error(`Calldata audit failed. See ${reportPath}`);
}

console.log(`Calldata audit passed: ${reportPath}`);
