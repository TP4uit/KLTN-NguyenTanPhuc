import { currentElectionId, getApprovedCommitments } from "./localVoterRegistration";
import { buildRegistryPreview, type RegistryPreview } from "./registryPreview";
import type { CommitmentScheme } from "./voterRegistrationModel";

const EXPECTED_LEVEL_SIZES = [8, 4, 2, 1];
const POSEIDON_COMPATIBLE_SCHEMES = new Set<CommitmentScheme>(["POSEIDON", "FIXTURE_POSEIDON"]);
const FORBIDDEN_PRIVATE_FIELD_PARTS = [
  "secret",
  "password",
  "votechoice",
  "candidatechoice",
  "proof",
  "nullifier",
  "txhash",
  "transactionhash",
  "wallet",
  "privatekey",
];

export type RegistryPreviewDiagnosticCheck = {
  name: string;
  passed: boolean;
  message?: string;
};

export type RegistryPreviewDiagnostics = {
  passed: boolean;
  checkedAt: string;
  preview: RegistryPreview;
  checks: RegistryPreviewDiagnosticCheck[];
};

function collectJsonFieldNames(value: unknown, fieldNames: string[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonFieldNames(item, fieldNames));
    return fieldNames;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, childValue]) => {
      fieldNames.push(key.toLowerCase());
      collectJsonFieldNames(childValue, fieldNames);
    });
  }

  return fieldNames;
}

function check(name: string, passed: boolean, message?: string): RegistryPreviewDiagnosticCheck {
  return {
    name,
    passed,
    ...(message && !passed ? { message } : {}),
  };
}

export async function runRegistryPreviewDiagnostics(): Promise<RegistryPreviewDiagnostics> {
  const preview = await buildRegistryPreview(currentElectionId);
  const approvedCommitments = getApprovedCommitments(currentElectionId);
  const jsonFieldNames = collectJsonFieldNames(preview);
  const sha256DemoApprovedRegistrations = approvedCommitments
    .filter((commitment) => commitment.commitmentScheme === "SHA256_DEMO")
    .map((commitment) => commitment.registrationId);
  const expectedSha256DemoRegistrations = new Set(sha256DemoApprovedRegistrations);
  const incompatibleSha256DemoRegistrations = new Set(
    preview.incompatibleLeaves
      .filter((leaf) => leaf.commitmentScheme === "SHA256_DEMO")
      .map((leaf) => leaf.registrationId),
  );
  const forbiddenFieldName = jsonFieldNames.find((fieldName) =>
    FORBIDDEN_PRIVATE_FIELD_PARTS.some((forbiddenPart) => fieldName.includes(forbiddenPart)),
  );
  const levelSizes = preview.levels.map((level) => level.length);

  const checks = [
    check(
      "hashFunction is Poseidon",
      preview.hashFunction === "Poseidon",
      `Expected Poseidon, received ${preview.hashFunction}.`,
    ),
    check(
      "leafFormula is identityCommitment",
      preview.leafFormula === "identityCommitment",
      `Expected identityCommitment, received ${preview.leafFormula}.`,
    ),
    check(
      "levels sizes are 8,4,2,1",
      EXPECTED_LEVEL_SIZES.length === levelSizes.length &&
        EXPECTED_LEVEL_SIZES.every((expectedSize, index) => levelSizes[index] === expectedSize),
      `Expected levels ${EXPECTED_LEVEL_SIZES.join(",")}, received ${levelSizes.join(",")}.`,
    ),
    check(
      "merkleRootPreview is a non-empty numeric string",
      /^\d+$/.test(preview.merkleRootPreview),
      "merkleRootPreview must be a non-empty decimal string.",
    ),
    check(
      "compatible leaves use only Poseidon schemes",
      preview.leaves.every((leaf) => POSEIDON_COMPATIBLE_SCHEMES.has(leaf.commitmentScheme)),
      "Preview leaves must contain only POSEIDON or FIXTURE_POSEIDON commitment schemes.",
    ),
    check(
      "SHA256_DEMO approvals appear only as incompatible leaves",
      sha256DemoApprovedRegistrations.every((registrationId) =>
        incompatibleSha256DemoRegistrations.has(registrationId),
      ) && preview.leaves.every((leaf) => leaf.commitmentScheme !== "SHA256_DEMO"),
      "Approved SHA256_DEMO registrations must be excluded from leaves and reported as incompatible.",
    ),
    check(
      "preview JSON field names exclude private data",
      !forbiddenFieldName,
      forbiddenFieldName ? `Forbidden private field name found: ${forbiddenFieldName}.` : undefined,
    ),
    check(
      "incompatible SHA256_DEMO set matches approved SHA256_DEMO set",
      preview.incompatibleLeaves
        .filter((leaf) => leaf.commitmentScheme === "SHA256_DEMO")
        .every((leaf) => expectedSha256DemoRegistrations.has(leaf.registrationId)),
      "Unexpected SHA256_DEMO registration found in incompatible leaves.",
    ),
  ];

  return {
    passed: checks.every((diagnosticCheck) => diagnosticCheck.passed),
    checkedAt: new Date().toISOString(),
    preview,
    checks,
  };
}
