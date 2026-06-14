import { resolve } from "node:path";

import {
  buildFixedDepthTree,
  createPoseidonHasher,
  recomputeRootFromPath,
} from "./merkle-registry.mjs";
import {
  evidenceDir,
  normalizeField,
  readJson,
  reportBase,
  rootDir,
  writeJson,
} from "./evidence-lib.mjs";

const registryPath = resolve(rootDir, "test", "fixtures", "registry", "registry.json");
const reportPath = resolve(evidenceDir, "audit-registry.json");

const registry = readJson(registryPath, "registry fixture");
const hasher = await createPoseidonHasher();
const recomputedIdentityCommitment = hasher.identityCommitment(
  registry.selectedVoterSecret,
);
const recomputedRootFromPath = recomputeRootFromPath(
  recomputedIdentityCommitment,
  registry.pathElements,
  registry.pathIndices,
  hasher.hashPair,
);
const recomputedTree = buildFixedDepthTree(
  registry.identityCommitments,
  hasher.hashPair,
);

const checks = {
  selectedIdentityCommitmentMatches:
    normalizeField(recomputedIdentityCommitment) ===
    normalizeField(registry.selectedIdentityCommitment),
  pathRootMatchesFixture:
    normalizeField(recomputedRootFromPath) === normalizeField(registry.merkleRoot),
  fullTreeRootMatchesFixture:
    normalizeField(recomputedTree.root) === normalizeField(registry.merkleRoot),
  pathElementsLength: registry.pathElements.length,
  pathIndicesLength: registry.pathIndices.length,
  pathIndicesAreBits: registry.pathIndices.every((value) => value === 0 || value === 1),
};

const report = {
  ...reportBase("audit-registry"),
  inputs: {
    registry: "test/fixtures/registry/registry.json",
  },
  selectedVoterIndex: registry.selectedVoterIndex,
  selectedVoterSecret: registry.selectedVoterSecret,
  selectedIdentityCommitment: registry.selectedIdentityCommitment,
  recomputedIdentityCommitment,
  merkleRoot: registry.merkleRoot,
  recomputedRootFromPath,
  recomputedFullTreeRoot: recomputedTree.root,
  checks,
  passed:
    checks.selectedIdentityCommitmentMatches &&
    checks.pathRootMatchesFixture &&
    checks.fullTreeRootMatchesFixture &&
    checks.pathElementsLength === registry.treeDepth &&
    checks.pathIndicesLength === registry.treeDepth &&
    checks.pathIndicesAreBits,
};

writeJson(reportPath, report);

if (!report.passed) {
  throw new Error(`Registry audit failed. See ${reportPath}`);
}

console.log(`Registry audit passed: ${reportPath}`);
process.exit(0);
