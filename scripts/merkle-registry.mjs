import { buildPoseidon } from "circomlibjs";

export const REGISTRY_TREE_DEPTH = 3;
export const REGISTRY_LEAF_COUNT = 2 ** REGISTRY_TREE_DEPTH;
export const DEFAULT_SELECTED_VOTER_INDEX = 0;
export const DEFAULT_VOTER_SECRETS = [
  "123456789",
  "223456789",
  "323456789",
  "423456789",
  "523456789",
  "623456789",
  "723456789",
  "823456789",
];

export async function createPoseidonHasher() {
  const poseidon = await buildPoseidon();

  function hash(values) {
    return poseidon.F.toString(poseidon(values.map((value) => BigInt(value))));
  }

  return {
    hash,
    hashPair(left, right) {
      return hash([left, right]);
    },
    identityCommitment(secretKey) {
      return hash([secretKey]);
    },
  };
}

export function buildFixedDepthTree(leaves, hashPair) {
  if (leaves.length !== REGISTRY_LEAF_COUNT) {
    throw new Error(`Expected ${REGISTRY_LEAF_COUNT} leaves`);
  }

  const layers = [leaves.map((leaf) => leaf.toString())];

  for (let level = 0; level < REGISTRY_TREE_DEPTH; level += 1) {
    const currentLayer = layers[level];
    const nextLayer = [];

    for (let i = 0; i < currentLayer.length; i += 2) {
      nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]));
    }

    layers.push(nextLayer);
  }

  return {
    depth: REGISTRY_TREE_DEPTH,
    leafCount: REGISTRY_LEAF_COUNT,
    layers,
    root: layers[REGISTRY_TREE_DEPTH][0],
  };
}

export function getMerkleProof(tree, leafIndex) {
  if (!Number.isInteger(leafIndex) || leafIndex < 0 || leafIndex >= tree.leafCount) {
    throw new Error(`leafIndex must be between 0 and ${tree.leafCount - 1}`);
  }

  const pathElements = [];
  const pathIndices = [];
  let index = leafIndex;

  for (let level = 0; level < tree.depth; level += 1) {
    const siblingIndex = index ^ 1;
    pathElements.push(tree.layers[level][siblingIndex]);
    pathIndices.push(index % 2);
    index = Math.floor(index / 2);
  }

  return { pathElements, pathIndices };
}

export function recomputeRootFromPath(leaf, pathElements, pathIndices, hashPair) {
  if (
    pathElements.length !== REGISTRY_TREE_DEPTH ||
    pathIndices.length !== REGISTRY_TREE_DEPTH
  ) {
    throw new Error(`Expected Merkle paths of length ${REGISTRY_TREE_DEPTH}`);
  }

  return pathElements.reduce((currentHash, siblingHash, level) => {
    if (pathIndices[level] === 0) {
      return hashPair(currentHash, siblingHash);
    }

    if (pathIndices[level] === 1) {
      return hashPair(siblingHash, currentHash);
    }

    throw new Error("pathIndices must contain only 0 or 1");
  }, leaf.toString());
}

export async function buildRegistryFixture({
  voterSecrets = DEFAULT_VOTER_SECRETS,
  selectedVoterIndex = DEFAULT_SELECTED_VOTER_INDEX,
} = {}) {
  const hasher = await createPoseidonHasher();
  const identityCommitments = voterSecrets.map((secretKey) =>
    hasher.identityCommitment(secretKey),
  );
  const tree = buildFixedDepthTree(identityCommitments, hasher.hashPair);
  const proof = getMerkleProof(tree, selectedVoterIndex);
  const selectedIdentityCommitment = identityCommitments[selectedVoterIndex];

  return {
    treeDepth: REGISTRY_TREE_DEPTH,
    leafCount: REGISTRY_LEAF_COUNT,
    hashFunction: "Poseidon",
    identityCommitmentFormula: "Poseidon(secretKey)",
    voterSecrets,
    identityCommitments,
    merkleRoot: tree.root,
    selectedVoterIndex,
    selectedVoterSecret: voterSecrets[selectedVoterIndex],
    selectedIdentityCommitment,
    pathElements: proof.pathElements,
    pathIndices: proof.pathIndices,
  };
}
