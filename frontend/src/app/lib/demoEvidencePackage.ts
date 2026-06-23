import { buildRegistrationEvidence } from "./localVoterRegistration";
import { buildRegistryPreview, type RegistryPreview } from "./registryPreview";
import {
  isResultsAuditSnapshot,
  validateResultsAuditSnapshot,
  type ResultsAuditSnapshot,
  type ResultsAuditValidation,
} from "./electionResults";
import type { RegistrationEvidence } from "./voterRegistrationModel";

export const DEMO_EVIDENCE_PACKAGE_VERSION = "1.0.0";

export type DemoEvidencePackage = {
  packageVersion: string;
  generatedAt: string;
  electionId: string;
  network: string;
  chainId: string;
  contractAddress: string;
  demoMode: ResultsAuditSnapshot["demoMode"];
  merkleRoot: string;
  resultsAudit: ResultsAuditSnapshot;
  registrationEvidence: RegistrationEvidence;
  registryPreview: RegistryPreview;
  checks: {
    resultsAuditValid: boolean;
    registryPreviewRootMatchesResultsRoot: boolean;
    staticFixtureRootMatchesResultsRoot: boolean;
    hasApprovedRegistrations: boolean;
    hasOnlyPublicFields: boolean;
  };
  warnings: string[];
};

export type DemoEvidencePackageValidation = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  resultsAuditValidation: ResultsAuditValidation;
};

const FORBIDDEN_PACKAGE_KEY_PARTS = [
  "identitySecret",
  "password",
  "proof",
  "nullifier",
  "voteChoice",
  "candidateChoice",
  "txHash",
  "transactionHash",
  "wallet",
  "privateKey",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" && value[key].trim().length > 0;
}

function hasBoolean(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "boolean";
}

function hasNonNegativeInteger(value: Record<string, unknown>, key: string) {
  return Number.isInteger(value[key]) && Number(value[key]) >= 0;
}

function rootsMatch(left: string, right: string) {
  return left.trim() === right.trim();
}

function isAllowedPublicCommitmentPath(path: string) {
  return (
    path.startsWith("$.registrationEvidence.approvedCommitments[") ||
    path.startsWith("$.registryPreview.leaves[") ||
    path.startsWith("$.registryPreview.incompatibleLeaves[")
  ) && path.endsWith(".identityCommitment");
}

export function collectForbiddenDemoEvidencePackagePaths(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenDemoEvidencePackagePaths(item, `${path}[${index}]`));
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const currentPath = `${path}.${key}`;
    const normalizedKey = key.toLowerCase();
    const keyIsForbidden = FORBIDDEN_PACKAGE_KEY_PARTS.some((forbiddenKey) =>
      normalizedKey.includes(forbiddenKey.toLowerCase()),
    );
    const commitmentOutsidePublicEvidence =
      normalizedKey.includes("identitycommitment") && !isAllowedPublicCommitmentPath(currentPath);
    const nestedMatches = collectForbiddenDemoEvidencePackagePaths(nestedValue, currentPath);

    if (keyIsForbidden || commitmentOutsidePublicEvidence) {
      return [currentPath, ...nestedMatches];
    }

    return nestedMatches;
  });
}

export function isDemoEvidencePackage(value: unknown): value is DemoEvidencePackage {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !hasString(value, "packageVersion") ||
    !hasString(value, "generatedAt") ||
    !hasString(value, "electionId") ||
    !hasString(value, "network") ||
    !hasString(value, "chainId") ||
    !hasString(value, "contractAddress") ||
    !hasString(value, "demoMode") ||
    !hasString(value, "merkleRoot") ||
    !isResultsAuditSnapshot(value.resultsAudit) ||
    !isRegistrationEvidenceShape(value.registrationEvidence) ||
    !isRegistryPreviewShape(value.registryPreview) ||
    !isRecord(value.checks) ||
    !Array.isArray(value.warnings)
  ) {
    return false;
  }

  return (
    hasBoolean(value.checks, "resultsAuditValid") &&
    hasBoolean(value.checks, "registryPreviewRootMatchesResultsRoot") &&
    hasBoolean(value.checks, "staticFixtureRootMatchesResultsRoot") &&
    hasBoolean(value.checks, "hasApprovedRegistrations") &&
    hasBoolean(value.checks, "hasOnlyPublicFields") &&
    value.warnings.every((warning) => typeof warning === "string")
  );
}

function isRegistrationEvidenceShape(value: unknown): value is RegistrationEvidence {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, "electionId") &&
    hasString(value, "generatedAt") &&
    hasNonNegativeInteger(value, "totalRegistrations") &&
    hasNonNegativeInteger(value, "pendingCount") &&
    hasNonNegativeInteger(value, "approvedCount") &&
    hasNonNegativeInteger(value, "rejectedCount") &&
    Array.isArray(value.approvedCommitments) &&
    value.approvedCommitments.every((commitment) =>
      isRecord(commitment) &&
      hasString(commitment, "registrationId") &&
      hasString(commitment, "identityCommitment") &&
      hasString(commitment, "commitmentScheme") &&
      hasString(commitment, "approvedAt") &&
      hasString(commitment, "reviewedAt"),
    )
  );
}

function isRegistryPreviewShape(value: unknown): value is RegistryPreview {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, "electionId") &&
    hasString(value, "generatedAt") &&
    hasNonNegativeInteger(value, "treeDepth") &&
    hasNonNegativeInteger(value, "capacity") &&
    value.hashFunction === "Poseidon" &&
    value.leafFormula === "identityCommitment" &&
    hasNonNegativeInteger(value, "approvedCount") &&
    hasNonNegativeInteger(value, "compatibleLeafCount") &&
    hasNonNegativeInteger(value, "incompatibleLeafCount") &&
    hasBoolean(value, "overflow") &&
    hasString(value, "merkleRootPreview") &&
    Array.isArray(value.leaves) &&
    Array.isArray(value.incompatibleLeaves) &&
    Array.isArray(value.levels) &&
    Array.isArray(value.warnings) &&
    value.warnings.every((warning) => typeof warning === "string")
  );
}

export async function buildDemoEvidencePackage(
  resultsAuditSnapshot: ResultsAuditSnapshot,
): Promise<DemoEvidencePackage> {
  const registrationEvidence = buildRegistrationEvidence(resultsAuditSnapshot.electionId);
  const registryPreview = await buildRegistryPreview(resultsAuditSnapshot.electionId);
  const resultsAuditValidation = validateResultsAuditSnapshot(resultsAuditSnapshot);
  const registryPreviewRootMatchesResultsRoot = rootsMatch(
    registryPreview.merkleRootPreview,
    resultsAuditSnapshot.merkleRoot,
  );
  const staticFixtureRootMatchesResultsRoot = rootsMatch(
    resultsAuditSnapshot.staticFixtureRoot,
    resultsAuditSnapshot.merkleRoot,
  );
  const warnings = [
    "resultsAudit contains on-chain reads for candidate tallies, lifecycle state, block height, Merkle root, and demo mode attribution.",
    "registrationEvidence and registryPreview are frontend-local demo metadata. They are not an on-chain voter registry.",
    "Approved identityCommitment values in registrationEvidence and registryPreview are public registry commitments, not identity secrets.",
    "This public evidence package is not a cryptographic proof of per-vote provenance.",
    ...resultsAuditSnapshot.warnings,
    ...registryPreview.warnings,
  ];
  const packageDraft: DemoEvidencePackage = {
    packageVersion: DEMO_EVIDENCE_PACKAGE_VERSION,
    generatedAt: new Date().toISOString(),
    electionId: resultsAuditSnapshot.electionId,
    network: resultsAuditSnapshot.network,
    chainId: resultsAuditSnapshot.chainId,
    contractAddress: resultsAuditSnapshot.contractAddress,
    demoMode: resultsAuditSnapshot.demoMode,
    merkleRoot: resultsAuditSnapshot.merkleRoot,
    resultsAudit: resultsAuditSnapshot,
    registrationEvidence,
    registryPreview,
    checks: {
      resultsAuditValid: resultsAuditValidation.isValid,
      registryPreviewRootMatchesResultsRoot,
      staticFixtureRootMatchesResultsRoot,
      hasApprovedRegistrations: registrationEvidence.approvedCount > 0,
      hasOnlyPublicFields: true,
    },
    warnings,
  };
  const forbiddenPaths = collectForbiddenDemoEvidencePackagePaths(packageDraft);

  return {
    ...packageDraft,
    checks: {
      ...packageDraft.checks,
      hasOnlyPublicFields: forbiddenPaths.length === 0,
    },
    warnings: forbiddenPaths.length > 0
      ? [
          ...warnings,
          `Evidence package contains forbidden private-looking fields: ${forbiddenPaths.join(", ")}.`,
        ]
      : warnings,
  };
}

export function validateDemoEvidencePackage(value: unknown): DemoEvidencePackageValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resultsAuditValidation = validateResultsAuditSnapshot(
    isRecord(value) && "resultsAudit" in value ? value.resultsAudit : value,
  );

  if (!isDemoEvidencePackage(value)) {
    errors.push("Evidence package is missing required public evidence fields or has invalid field types.");

    return {
      isValid: false,
      errors,
      warnings,
      resultsAuditValidation,
    };
  }

  const forbiddenPaths = collectForbiddenDemoEvidencePackagePaths(value);

  if (forbiddenPaths.length > 0) {
    errors.push(`Evidence package contains forbidden private fields: ${forbiddenPaths.join(", ")}.`);
  }

  if (!resultsAuditValidation.isValid || !value.checks.resultsAuditValid) {
    errors.push("Embedded Results audit JSON is not valid.");
  }

  if (
    value.electionId !== value.resultsAudit.electionId ||
    value.network !== value.resultsAudit.network ||
    value.chainId !== value.resultsAudit.chainId ||
    value.contractAddress !== value.resultsAudit.contractAddress ||
    value.demoMode !== value.resultsAudit.demoMode ||
    value.merkleRoot !== value.resultsAudit.merkleRoot
  ) {
    errors.push("Evidence package metadata must match the embedded Results audit JSON.");
  }

  if (value.registryPreview.electionId !== value.electionId) {
    errors.push("Registry preview electionId must match the evidence package electionId.");
  }

  if (value.registrationEvidence.electionId !== value.electionId) {
    errors.push("Registration evidence electionId must match the evidence package electionId.");
  }

  if (
    value.checks.registryPreviewRootMatchesResultsRoot !==
    rootsMatch(value.registryPreview.merkleRootPreview, value.resultsAudit.merkleRoot)
  ) {
    errors.push("registryPreviewRootMatchesResultsRoot check does not match package contents.");
  }

  if (
    value.checks.staticFixtureRootMatchesResultsRoot !==
    rootsMatch(value.resultsAudit.staticFixtureRoot, value.resultsAudit.merkleRoot)
  ) {
    errors.push("staticFixtureRootMatchesResultsRoot check does not match package contents.");
  }

  if (value.checks.hasApprovedRegistrations !== (value.registrationEvidence.approvedCount > 0)) {
    errors.push("hasApprovedRegistrations check does not match registration evidence.");
  }

  if (value.checks.hasOnlyPublicFields !== (forbiddenPaths.length === 0)) {
    errors.push("hasOnlyPublicFields check does not match the evidence package private-field scan.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [...value.warnings, ...warnings],
    resultsAuditValidation,
  };
}
