import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect } from "chai";

import {
  REGISTRY_LEAF_COUNT,
  REGISTRY_TREE_DEPTH,
  buildFixedDepthTree,
  createPoseidonHasher,
  recomputeRootFromPath,
} from "../scripts/merkle-registry.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const registryFixture = JSON.parse(
  readFileSync(resolve(testDir, "fixtures", "registry", "registry.json"), "utf8"),
);
const hasher = await createPoseidonHasher();

describe("off-chain Merkle registry helper", function () {
  it("builds a fixed depth-3 tree with 8 leaves", function () {
    expect(registryFixture.treeDepth).to.equal(REGISTRY_TREE_DEPTH);
    expect(registryFixture.leafCount).to.equal(REGISTRY_LEAF_COUNT);
    expect(registryFixture.voterSecrets).to.have.lengthOf(REGISTRY_LEAF_COUNT);
    expect(registryFixture.identityCommitments).to.have.lengthOf(
      REGISTRY_LEAF_COUNT,
    );
  });

  it("includes the selected identity commitment in the tree", function () {
    const selectedCommitment =
      registryFixture.identityCommitments[registryFixture.selectedVoterIndex];

    expect(selectedCommitment).to.equal(
      registryFixture.selectedIdentityCommitment,
    );
    expect(registryFixture.voterSecrets).to.include("123456789");
  });

  it("recomputes the fixture root from pathElements and pathIndices", function () {
    const recomputedRoot = recomputeRootFromPath(
      registryFixture.selectedIdentityCommitment,
      registryFixture.pathElements,
      registryFixture.pathIndices,
      hasher.hashPair,
    );

    expect(recomputedRoot).to.equal(registryFixture.merkleRoot);
  });

  it("matches the root produced by rebuilding the full tree", function () {
    const rebuiltTree = buildFixedDepthTree(
      registryFixture.identityCommitments,
      hasher.hashPair,
    );

    expect(rebuiltTree.root).to.equal(registryFixture.merkleRoot);
  });

  it("does not verify when the selected leaf or path is changed", function () {
    const wrongLeaf = registryFixture.identityCommitments[2];
    const wrongLeafRoot = recomputeRootFromPath(
      wrongLeaf,
      registryFixture.pathElements,
      registryFixture.pathIndices,
      hasher.hashPair,
    );
    const changedPathElements = [...registryFixture.pathElements];
    changedPathElements[0] = registryFixture.identityCommitments[3];
    const changedPathRoot = recomputeRootFromPath(
      registryFixture.selectedIdentityCommitment,
      changedPathElements,
      registryFixture.pathIndices,
      hasher.hashPair,
    );

    expect(wrongLeafRoot).to.not.equal(registryFixture.merkleRoot);
    expect(changedPathRoot).to.not.equal(registryFixture.merkleRoot);
  });
});
