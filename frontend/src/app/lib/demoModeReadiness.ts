import { getLocalRegistryFixtureIdentity } from "./browserProof";
import { localElection } from "./localElection";
import { buildRegistryPreview } from "./registryPreview";

export type DemoMode = "STATIC_FIXTURE" | "DYNAMIC_POSEIDON" | "CUSTOM" | "UNSET";

export type DemoModeReadiness = {
  activeMode: DemoMode;
  staticFixtureRoot: string;
  dynamicPreviewRoot: string;
  metadataRoot: string;
  contractRoot: string;
  staticModeReady: boolean;
  dynamicModeReady: boolean;
  warnings: string[];
  recommendedActions: string[];
};

function normalizeRoot(root?: string | null) {
  return root?.trim() ?? "";
}

function isZeroRoot(root: string) {
  if (!root || !/^\d+$/.test(root)) {
    return !root;
  }

  return BigInt(root) === 0n;
}

function rootsMatch(left: string, right: string) {
  return normalizeRoot(left) === normalizeRoot(right);
}

async function getModeRoots() {
  const fixtureIdentity = getLocalRegistryFixtureIdentity();
  const preview = await buildRegistryPreview(localElection.electionId);

  return {
    staticFixtureRoot: normalizeRoot(fixtureIdentity.merkleRoot),
    dynamicPreviewRoot: normalizeRoot(preview.merkleRootPreview),
    metadataRoot: normalizeRoot(localElection.merkleRoot),
  };
}

export async function classifyDemoModeRoot(root: string | null | undefined): Promise<DemoMode> {
  const normalizedRoot = normalizeRoot(root);

  if (isZeroRoot(normalizedRoot)) {
    return "UNSET";
  }

  const { staticFixtureRoot, dynamicPreviewRoot } = await getModeRoots();

  if (rootsMatch(normalizedRoot, staticFixtureRoot)) {
    return "STATIC_FIXTURE";
  }

  if (rootsMatch(normalizedRoot, dynamicPreviewRoot)) {
    return "DYNAMIC_POSEIDON";
  }

  return "CUSTOM";
}

export async function buildDemoModeReadiness(
  contractRoot: string | null | undefined,
  lifecycleState: number,
): Promise<DemoModeReadiness> {
  const normalizedContractRoot = normalizeRoot(contractRoot);
  const { staticFixtureRoot, dynamicPreviewRoot, metadataRoot } = await getModeRoots();
  const activeMode = await classifyDemoModeRoot(normalizedContractRoot);
  const staticModeReady = activeMode === "STATIC_FIXTURE";
  const dynamicModeReady = activeMode === "DYNAMIC_POSEIDON";
  const warnings: string[] = [];
  const recommendedActions: string[] = [];
  const rootsAreSame = rootsMatch(staticFixtureRoot, dynamicPreviewRoot);

  if (activeMode === "UNSET") {
    warnings.push("Contract root is empty or zero; neither demo voting mode is ready.");
    recommendedActions.push(
      "Choose Static Fixture Mode or Dynamic Poseidon Mode, fill the matching root, then confirm setMerkleRoot.",
    );
  }

  if (activeMode === "CUSTOM") {
    warnings.push(
      "Contract root does not match the static fixture root or the dynamic Poseidon preview root; both demo submit paths may be blocked.",
    );
    recommendedActions.push(
      "Use a listed demo mode root unless you intentionally want a custom root that may block both submit paths.",
    );
  }

  if (staticModeReady) {
    recommendedActions.push("Static Fixture Mode is selected. Seeded fixture/static Dashboard submit can use this root.");
    if (!rootsAreSame) {
      warnings.push("Guarded Dynamic submit will be blocked unless the contract root is changed to the dynamic preview root.");
    }
  }

  if (dynamicModeReady) {
    recommendedActions.push(
      "Dynamic Poseidon Mode is selected. Approved Poseidon voters can use guarded Dynamic submit when readiness succeeds.",
    );
    if (!rootsAreSame) {
      warnings.push("Static fixture Dashboard submit will be blocked unless the contract root is changed to the static fixture root.");
    }
  }

  if (!rootsMatch(metadataRoot, staticFixtureRoot) && !rootsMatch(metadataRoot, dynamicPreviewRoot)) {
    warnings.push("Local election metadata root does not match either demo mode root.");
  }

  if (lifecycleState === 0) {
    recommendedActions.push("Election is in Registration. Root changes still require explicit setMerkleRoot confirmation.");
  } else if (lifecycleState === 1) {
    recommendedActions.push("Election is Open. Submit behavior now depends on the active root mode.");
  } else if (lifecycleState === 2) {
    warnings.push("Election is Closed; voting submits are no longer available.");
  } else {
    warnings.push(`Election state ${lifecycleState} is not a known demo lifecycle state.`);
  }

  recommendedActions.push("Mode buttons only fill the New Merkle root input; they do not submit transactions.");

  return {
    activeMode,
    staticFixtureRoot,
    dynamicPreviewRoot,
    metadataRoot,
    contractRoot: normalizedContractRoot,
    staticModeReady,
    dynamicModeReady,
    warnings: Array.from(new Set(warnings)),
    recommendedActions: Array.from(new Set(recommendedActions)),
  };
}
