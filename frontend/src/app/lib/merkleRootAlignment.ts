import { getLocalRegistryFixtureIdentity } from "./browserProof";
import { localElection } from "./localElection";
import { buildRegistryPreview } from "./registryPreview";

export type MerkleRootAlignment = {
  contractRoot: string;
  fixtureRoot: string;
  previewRoot: string;
  metadataRoot: string;
  contractMatchesFixture: boolean;
  contractMatchesPreview: boolean;
  metadataMatchesFixture: boolean;
  recommendedRoot: string;
  warnings: string[];
};

function normalizeRoot(value: string) {
  return value.trim();
}

function rootsMatch(left: string, right: string) {
  return normalizeRoot(left) === normalizeRoot(right);
}

export async function buildMerkleRootAlignment(contractRoot: string): Promise<MerkleRootAlignment> {
  const fixtureIdentity = getLocalRegistryFixtureIdentity();
  const preview = await buildRegistryPreview(localElection.electionId);
  const normalizedContractRoot = normalizeRoot(contractRoot);
  const fixtureRoot = normalizeRoot(fixtureIdentity.merkleRoot);
  const previewRoot = normalizeRoot(preview.merkleRootPreview);
  const metadataRoot = normalizeRoot(localElection.merkleRoot);
  const contractMatchesFixture = rootsMatch(normalizedContractRoot, fixtureRoot);
  const contractMatchesPreview = rootsMatch(normalizedContractRoot, previewRoot);
  const metadataMatchesFixture = rootsMatch(metadataRoot, fixtureRoot);
  const warnings: string[] = [];

  if (!contractMatchesFixture) {
    warnings.push(
      "Browser proof voting will fail unless the contract Merkle root matches the static proof fixture root.",
    );
  }

  if (contractMatchesPreview && !contractMatchesFixture) {
    warnings.push(
      "The contract root matches the registry preview root, but the current browser proof demo still expects the static fixture root.",
    );
  }

  if (!metadataMatchesFixture) {
    warnings.push("Local election metadata does not match the static proof fixture root.");
  }

  if (previewRoot !== fixtureRoot) {
    warnings.push(
      "Registry preview root is preview-only and is not proof-compatible until matching Poseidon proof inputs are generated later.",
    );
  }

  return {
    contractRoot: normalizedContractRoot,
    fixtureRoot,
    previewRoot,
    metadataRoot,
    contractMatchesFixture,
    contractMatchesPreview,
    metadataMatchesFixture,
    recommendedRoot: fixtureRoot,
    warnings,
  };
}
