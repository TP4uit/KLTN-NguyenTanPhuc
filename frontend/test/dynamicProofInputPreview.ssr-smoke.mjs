import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const storage = new Map();

globalThis.window = {
  localStorage: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
globalThis.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};

const registryFixture = JSON.parse(await readFile(new URL("../src/contracts/registry.local.json", import.meta.url)));
const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });

function setRegistrations(registrations) {
  window.localStorage.setItem("zkvote.voterRegistrations", JSON.stringify(registrations));
}

function setIdentitySecrets(secrets) {
  window.localStorage.setItem("zkvote.localIdentitySecrets", JSON.stringify(secrets));
}

function collectJsonFieldNames(value, fieldNames = []) {
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

const forbiddenFieldParts = [
  "secret",
  "password",
  "votechoice",
  "candidatechoice",
  "proof",
  "txhash",
  "transactionhash",
  "wallet",
  "privatekey",
];

try {
  const { currentElectionId } = await server.ssrLoadModule("/src/app/lib/localVoterRegistration.ts");
  const {
    buildDynamicMerklePathPreview,
    buildDynamicProofInputPreview,
    getDynamicProofInputReadiness,
  } = await server.ssrLoadModule("/src/app/lib/dynamicProofInputPreview.ts");
  const { runDynamicBrowserProofCheck } = await server.ssrLoadModule("/src/app/lib/dynamicBrowserProofCheck.ts");
  const { getDynamicVoteReadiness } = await server.ssrLoadModule("/src/app/lib/dynamicVoteReadiness.ts");
  const { submitDynamicVote } = await server.ssrLoadModule("/src/app/lib/dynamicVoteSubmit.ts");
  const { listRegistrations } = await server.ssrLoadModule("/src/app/lib/localVoterRegistration.ts");
  const { buildRegistryPreview } = await server.ssrLoadModule("/src/app/lib/registryPreview.ts");

  setRegistrations([
    {
      id: "registration-fixture",
      userId: "seeded-voter",
      electionId: currentElectionId,
      status: "APPROVED",
      identityCommitment: registryFixture.selectedIdentityCommitment,
      commitmentScheme: "FIXTURE_POSEIDON",
      createdAt: "2026-06-22T00:00:00.000Z",
      reviewedAt: "2026-06-22T00:01:00.000Z",
    },
    {
      id: "registration-poseidon",
      userId: "new-voter",
      electionId: currentElectionId,
      status: "APPROVED",
      identityCommitment: "123456789987654321",
      commitmentScheme: "POSEIDON",
      createdAt: "2026-06-22T00:00:00.000Z",
      reviewedAt: "2026-06-22T00:01:00.000Z",
    },
    {
      id: "registration-old-sha",
      userId: "old-voter",
      electionId: currentElectionId,
      status: "APPROVED",
      identityCommitment: "abcdef123456",
      createdAt: "2026-06-22T00:00:00.000Z",
      reviewedAt: "2026-06-22T00:01:00.000Z",
    },
  ]);
  setIdentitySecrets([
    {
      userId: "seeded-voter",
      electionId: currentElectionId,
      secret: registryFixture.selectedVoterSecret,
      createdAt: "2026-06-22T00:00:00.000Z",
    },
    {
      userId: "new-voter",
      electionId: currentElectionId,
      secret: "987654321123456789",
      createdAt: "2026-06-22T00:00:00.000Z",
    },
  ]);

  const fixturePathPreview = await buildDynamicMerklePathPreview("registration-fixture");
  const poseidonInputPreview = await buildDynamicProofInputPreview("registration-poseidon", 2);
  const shaRegistration = listRegistrations(currentElectionId).find(
    (registration) => registration.id === "registration-old-sha",
  );
  const shaReadiness = await getDynamicProofInputReadiness(shaRegistration);
  let shaProofCheckBlocked = false;

  try {
    await runDynamicBrowserProofCheck("registration-old-sha", 1);
  } catch {
    shaProofCheckBlocked = true;
  }

  const privateFieldName = collectJsonFieldNames(poseidonInputPreview).find((fieldName) =>
    forbiddenFieldParts.some((forbiddenPart) => fieldName.includes(forbiddenPart)),
  );
  const initialRegistryPreview = await buildRegistryPreview(currentElectionId);
  const poseidonRegistration = listRegistrations(currentElectionId).find(
    (registration) => registration.id === "registration-poseidon",
  );
  const dynamicReady = await getDynamicVoteReadiness(
    poseidonRegistration,
    { electionState: 1, electionStateName: "Open" },
    initialRegistryPreview.merkleRootPreview,
  );
  const dynamicRootMismatch = await getDynamicVoteReadiness(
    poseidonRegistration,
    { electionState: 1, electionStateName: "Open" },
    registryFixture.merkleRoot,
  );
  const dynamicAlreadyVoted = await getDynamicVoteReadiness(
    poseidonRegistration,
    { electionState: 1, electionStateName: "Open" },
    initialRegistryPreview.merkleRootPreview,
    { hasVotedInSession: true },
  );
  let dynamicSubmitMismatchBlocked = false;
  let dynamicSubmitMismatchCastVoteCount = 0;

  try {
    await submitDynamicVote({
      registration: poseidonRegistration,
      candidateId: 1,
      contract: {
        async castVote() {
          dynamicSubmitMismatchCastVoteCount += 1;
          return {
            hash: "0xshould-not-submit",
            async wait() {
              return { hash: "0xshould-not-submit" };
            },
          };
        },
      },
      lifecycle: { electionState: 1, electionStateName: "Open" },
      contractRoot: registryFixture.merkleRoot,
      hasVotedInSession: false,
    });
  } catch (error) {
    dynamicSubmitMismatchBlocked =
      error instanceof Error && error.message.includes("Dynamic submit blocked");
  }

  setRegistrations([
    {
      id: "registration-missing-material",
      userId: "missing-material-voter",
      electionId: currentElectionId,
      status: "APPROVED",
      identityCommitment: "222222222222222222",
      commitmentScheme: "POSEIDON",
      createdAt: "2026-06-22T00:00:00.000Z",
      reviewedAt: "2026-06-22T00:01:00.000Z",
    },
  ]);
  setIdentitySecrets([]);
  const missingMaterialRegistration = listRegistrations(currentElectionId)[0];
  const missingMaterialReadiness = await getDynamicProofInputReadiness(missingMaterialRegistration);
  const missingMaterialInputPreview = await buildDynamicProofInputPreview("registration-missing-material", 1);
  let missingMaterialProofCheckBlocked = false;

  try {
    await runDynamicBrowserProofCheck("registration-missing-material", 1);
  } catch {
    missingMaterialProofCheckBlocked = true;
  }

  const overflowRegistrations = Array.from({ length: 9 }, (_, index) => ({
    id: `registration-overflow-${index}`,
    userId: `overflow-voter-${index}`,
    electionId: currentElectionId,
    status: "APPROVED",
    identityCommitment: `100${index}`,
    commitmentScheme: "POSEIDON",
    createdAt: "2026-06-22T00:00:00.000Z",
    reviewedAt: "2026-06-22T00:01:00.000Z",
  }));
  setRegistrations(overflowRegistrations);
  setIdentitySecrets([]);
  const overflowPreview = await buildRegistryPreview(currentElectionId);
  const excludedOverflowRegistration = listRegistrations(currentElectionId).find(
    (registration) => !overflowPreview.leaves.some((leaf) => leaf.registrationId === registration.id),
  );
  const overflowReadiness = await getDynamicProofInputReadiness(excludedOverflowRegistration);

  const checks = [
    ["fixture registration path has depth 3", fixturePathPreview.pathElements.length === 3],
    ["fixture registration path indices have depth 3", fixturePathPreview.pathIndices.length === 3],
    ["new POSEIDON registration builds full input preview", poseidonInputPreview.fullInputReady],
    ["new POSEIDON registration has nullifier preview", /^\d+$/.test(poseidonInputPreview.nullifierHashPreview ?? "")],
    ["dynamic vote readiness succeeds when contract root matches preview", dynamicReady.isReady],
    ["dynamic vote readiness blocks when contract root mismatches preview", !dynamicRootMismatch.isReady && dynamicRootMismatch.reasons.some((reason) => reason.includes("does not match"))],
    ["dynamic vote readiness blocks after session vote", !dynamicAlreadyVoted.isReady && dynamicAlreadyVoted.reasons.some((reason) => reason.includes("already recorded"))],
    ["dynamic submit blocks before castVote when root mismatches preview", dynamicSubmitMismatchBlocked && dynamicSubmitMismatchCastVoteCount === 0],
    ["SHA256_DEMO registration is incompatible", shaReadiness.status === "INCOMPATIBLE"],
    ["SHA256_DEMO dynamic proof check is blocked", shaProofCheckBlocked],
    ["missing identity material is path-only", missingMaterialReadiness.status === "PATH_ONLY"],
    ["missing identity material omits nullifier preview", !missingMaterialInputPreview.nullifierHashPreview],
    ["missing identity material blocks dynamic proof check", missingMaterialProofCheckBlocked],
    ["overflow registration is blocked", overflowReadiness.status === "BLOCKED"],
    ["overflow registration cannot build path preview", !overflowReadiness.canBuildMerklePathPreview],
    ["exported JSON field names redact forbidden private fields", !privateFieldName],
  ];
  const failed = checks.filter(([, passed]) => !passed);

  console.log(JSON.stringify({
    passed: failed.length === 0,
    checks: checks.map(([name, passed]) => ({ name, passed })),
    fixtureLeafIndex: fixturePathPreview.leafIndex,
    poseidonLeafIndex: poseidonInputPreview.leafIndex,
    overflowExcludedRegistrationId: excludedOverflowRegistration?.id,
  }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await server.close();
}
