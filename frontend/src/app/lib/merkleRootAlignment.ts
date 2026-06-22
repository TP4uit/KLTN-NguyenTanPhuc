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

export type MerkleRootClassificationKind = "EMPTY" | "FIXTURE" | "PREVIEW" | "CUSTOM";

export type MerkleRootClassification = {
  kind: MerkleRootClassificationKind;
  label: string;
  warning?: string;
};

export type OpenElectionReadinessSeverity = "success" | "warning" | "blocked";

export type OpenElectionReadiness = {
  canOpenSafely: boolean;
  severity: OpenElectionReadinessSeverity;
  label: string;
  warnings: string[];
};

function normalizeRoot(value: string) {
  return value.trim();
}

function rootsMatch(left: string, right: string) {
  return normalizeRoot(left) === normalizeRoot(right);
}

function isEmptyOrZeroRoot(value: string) {
  const normalizedValue = normalizeRoot(value);

  if (!normalizedValue) {
    return true;
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return false;
  }

  return BigInt(normalizedValue) === 0n;
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
      "Static fixture Dashboard submit will fail unless the contract Merkle root matches the static proof fixture root.",
    );
  }

  if (contractMatchesPreview && !contractMatchesFixture) {
    warnings.push(
      "The contract root matches the Dynamic Poseidon Mode root. Guarded dynamic submit can use this root when readiness succeeds; static fixture submit still expects the fixture root.",
    );
  }

  if (!metadataMatchesFixture) {
    warnings.push("Local election metadata does not match the static proof fixture root.");
  }

  if (previewRoot !== fixtureRoot) {
    warnings.push(
      "Static Fixture Mode and Dynamic Poseidon Mode use different roots. Choose the mode intentionally before opening the election.",
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

export function classifyOpenElectionReadiness(
  alignment: MerkleRootAlignment | null,
  lifecycleState: number,
): OpenElectionReadiness {
  if (!alignment) {
    return {
      canOpenSafely: false,
      severity: "blocked",
      label: "Merkle root alignment unavailable",
      warnings: ["Load Merkle root alignment before opening the election."],
    };
  }

  if (lifecycleState !== 0) {
    return {
      canOpenSafely: false,
      severity: "blocked",
      label: "Election is not in Registration",
      warnings: ["openElection is only available while the election is in Registration state."],
    };
  }

  if (isEmptyOrZeroRoot(alignment.contractRoot)) {
    return {
      canOpenSafely: false,
      severity: "blocked",
      label: "Contract root is empty or zero",
      warnings: ["Set a non-zero Merkle root before opening the election."],
    };
  }

  if (alignment.contractMatchesFixture) {
    return {
      canOpenSafely: true,
      severity: "success",
      label: "Static Fixture Mode root selected",
      warnings: ["Static fixture Dashboard submit can use this root. Guarded dynamic submit requires the dynamic preview root."],
    };
  }

  if (alignment.contractMatchesPreview) {
    return {
      canOpenSafely: true,
      severity: "success",
      label: "Dynamic Poseidon Mode root selected",
      warnings: [
        "Guarded dynamic submit can use this root when readiness succeeds. Static fixture Dashboard submit expects the fixture root.",
      ],
    };
  }

  return {
    canOpenSafely: false,
    severity: "warning",
    label: "Custom root may break Dashboard submits",
    warnings: ["The contract root does not match the static fixture or dynamic Poseidon preview root; both demo submit paths may be blocked."],
  };
}

export function classifyMerkleRootInput(
  root: string,
  alignment: Pick<MerkleRootAlignment, "fixtureRoot" | "previewRoot"> | null,
): MerkleRootClassification {
  const normalizedRoot = normalizeRoot(root);

  if (!normalizedRoot) {
    return {
      kind: "EMPTY",
      label: "No root selected",
    };
  }

  if (alignment && rootsMatch(normalizedRoot, alignment.fixtureRoot)) {
    return {
      kind: "FIXTURE",
      label: "Static Fixture Mode root",
    };
  }

  if (alignment && rootsMatch(normalizedRoot, alignment.previewRoot)) {
    return {
      kind: "PREVIEW",
      label: "Dynamic Poseidon Mode root",
      warning: "Guarded dynamic submit can target this root when readiness succeeds. Static fixture submit expects the fixture root.",
    };
  }

  return {
    kind: "CUSTOM",
    label: "Custom root",
    warning: "Dashboard submit may fail because Static Fixture Mode expects the fixture root and Dynamic Poseidon Mode expects the preview root.",
  };
}
