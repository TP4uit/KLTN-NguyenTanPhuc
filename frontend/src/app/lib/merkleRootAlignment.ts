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
      "Static Dashboard submit will fail unless the contract Merkle root matches the static proof fixture root.",
    );
  }

  if (contractMatchesPreview && !contractMatchesFixture) {
    warnings.push(
      "The contract root matches the Poseidon preview-only root. Dynamic dev-check proofs can target this root, but Dashboard dynamic submit remains disabled.",
    );
  }

  if (!metadataMatchesFixture) {
    warnings.push("Local election metadata does not match the static proof fixture root.");
  }

  if (previewRoot !== fixtureRoot) {
    warnings.push(
      "Poseidon preview-only root has matching preview paths and dev-check proofs, but dynamic submit is still disabled until a later guarded flow.",
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
      label: "Static Dashboard submit root-compatible",
      warnings: [],
    };
  }

  if (alignment.contractMatchesPreview) {
    return {
      canOpenSafely: false,
      severity: "warning",
      label: "Preview root selected; static Dashboard submit not ready",
      warnings: [
        "The contract root matches the Poseidon preview-only root. Static Dashboard submit still expects the fixture root; dynamic submit is disabled until a later guarded flow.",
      ],
    };
  }

  return {
    canOpenSafely: false,
    severity: "warning",
    label: "Custom root may break Dashboard submits",
    warnings: ["The contract root does not match the static fixture or Poseidon preview-only root."],
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
      label: "Proof-compatible fixture root",
    };
  }

  if (alignment && rootsMatch(normalizedRoot, alignment.previewRoot)) {
    return {
      kind: "PREVIEW",
      label: "Poseidon preview-only root",
      warning: "Static Dashboard submit expects the fixture root. Dynamic dev-check proofs can target the preview root, but dynamic submit remains disabled.",
    };
  }

  return {
    kind: "CUSTOM",
    label: "Custom root",
    warning: "Dashboard submit may fail because the static path expects the fixture root and dynamic submit is disabled.",
  };
}
