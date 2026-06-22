import { getLocalRegistryFixtureIdentity } from "./browserProof";
import {
  buildDynamicProofInputPreview,
  getDynamicProofInputReadiness,
} from "./dynamicProofInputPreview";
import type { ElectionLifecycle } from "./localElection";
import { getIdentitySecret, getRegistrationCommitmentScheme } from "./localVoterRegistration";
import { buildRegistryPreview } from "./registryPreview";
import type { VoterRegistration } from "./voterRegistrationModel";

export type DynamicVoteReadinessSeverity = "success" | "warning" | "blocked";

export type DynamicVoteReadiness = {
  isReady: boolean;
  severity: DynamicVoteReadinessSeverity;
  label: string;
  reasons: string[];
  contractRoot: string | null;
  dynamicPreviewRoot: string;
  staticFixtureRoot: string;
  contractMatchesDynamicPreview: boolean;
  recommendedAction: string;
};

export type DynamicVoteReadinessOptions = {
  hasVotedInSession?: boolean;
};

const COMPATIBLE_SCHEMES = new Set(["POSEIDON", "FIXTURE_POSEIDON"]);

function normalizeRoot(root?: string | null) {
  return root?.trim() || null;
}

function rootsMatch(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizeRoot(left);
  const normalizedRight = normalizeRoot(right);

  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

export function classifyDynamicVoteReadiness(input: {
  reasons: string[];
  contractRoot: string | null;
  dynamicPreviewRoot: string;
  staticFixtureRoot: string;
  contractMatchesDynamicPreview: boolean;
}): DynamicVoteReadiness {
  if (input.reasons.length === 0) {
    return {
      isReady: true,
      severity: "success",
      label: "Dynamic submit prerequisites satisfied",
      reasons: ["Dynamic Poseidon vote submission prerequisites are satisfied."],
      contractRoot: input.contractRoot,
      dynamicPreviewRoot: input.dynamicPreviewRoot,
      staticFixtureRoot: input.staticFixtureRoot,
      contractMatchesDynamicPreview: input.contractMatchesDynamicPreview,
      recommendedAction: "Use the explicit Dynamic submit button on a candidate card, or keep using the static fixture path.",
    };
  }

  const rootOnlyBlock =
    input.reasons.length === 1 &&
    input.reasons[0] === "Contract Merkle root does not match the dynamic Poseidon preview root.";

  return {
    isReady: false,
    severity: rootOnlyBlock ? "warning" : "blocked",
    label: rootOnlyBlock ? "Dynamic submit blocked by contract root" : "Dynamic submit not ready",
    reasons: input.reasons,
    contractRoot: input.contractRoot,
    dynamicPreviewRoot: input.dynamicPreviewRoot,
    staticFixtureRoot: input.staticFixtureRoot,
    contractMatchesDynamicPreview: input.contractMatchesDynamicPreview,
    recommendedAction: rootOnlyBlock
      ? "Keep Dashboard on the static fixture path. Dynamic submit is available only when the contract root intentionally matches the dynamic preview root."
      : "Resolve the blocked prerequisites first. Dynamic submit remains disabled.",
  };
}

export async function getDynamicVoteReadiness(
  registration: VoterRegistration | null,
  lifecycle: ElectionLifecycle,
  contractRoot: string | null,
  options: DynamicVoteReadinessOptions = {},
): Promise<DynamicVoteReadiness> {
  const registryPreview = await buildRegistryPreview();
  const fixtureIdentity = getLocalRegistryFixtureIdentity();
  const normalizedContractRoot = normalizeRoot(contractRoot);
  const dynamicPreviewRoot = registryPreview.merkleRootPreview;
  const contractMatchesDynamicPreview = rootsMatch(normalizedContractRoot, dynamicPreviewRoot);
  const reasons: string[] = [];

  if (!registration) {
    reasons.push("No voter registration exists for this election.");
  } else {
    const commitmentScheme = getRegistrationCommitmentScheme(registration);
    const leaf = registryPreview.leaves.find((candidate) => candidate.registrationId === registration.id);

    if (registration.status !== "APPROVED") {
      reasons.push("Registration must be approved.");
    }

    if (!COMPATIBLE_SCHEMES.has(commitmentScheme)) {
      reasons.push(`${commitmentScheme} is not compatible with the dynamic Poseidon registry preview.`);
    }

    if (!leaf) {
      reasons.push("Registration is not present in dynamic registry preview leaves.");
    }

    if (!getIdentitySecret(registration.userId, registration.electionId)) {
      reasons.push("Local identity material is required for dynamic proof generation.");
    }

    try {
      const proofReadiness = await getDynamicProofInputReadiness(registration);

      if (!proofReadiness.canBuildFullInputPreview) {
        reasons.push(proofReadiness.reason);
      } else {
        await buildDynamicProofInputPreview(registration.id, "1");
      }
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : "Dynamic proof input preview cannot be built.");
    }
  }

  if (lifecycle.electionState !== 1) {
    reasons.push("Election must be Open.");
  }

  if (!normalizedContractRoot) {
    reasons.push("Live contract Merkle root is unavailable. Connect a wallet to read the contract state.");
  } else if (!contractMatchesDynamicPreview) {
    reasons.push("Contract Merkle root does not match the dynamic Poseidon preview root.");
  }

  if (options.hasVotedInSession) {
    reasons.push("This UI session already recorded a vote.");
  }

  return classifyDynamicVoteReadiness({
    reasons: Array.from(new Set(reasons)),
    contractRoot: normalizedContractRoot,
    dynamicPreviewRoot,
    staticFixtureRoot: fixtureIdentity.merkleRoot,
    contractMatchesDynamicPreview,
  });
}
