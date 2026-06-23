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
  "identitysecret",
  "voteridentity",
  "identitycommitment",
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

function makeContract(root, counts = [2, 1, 0, 0]) {
  return {
    async getVotes(candidateId) {
      return counts[Number(candidateId) - 1] ?? 0;
    },
    async electionState() {
      return 1;
    },
    async merkleRoot() {
      return root;
    },
  };
}

const provider = {
  async getBlockNumber() {
    return 123;
  },
};

try {
  const { currentElectionId } = await server.ssrLoadModule("/src/app/lib/localVoterRegistration.ts");
  const { buildRegistryPreview } = await server.ssrLoadModule("/src/app/lib/registryPreview.ts");
  const {
    buildResultsAuditSnapshot,
    readOnChainElectionResults,
    validateResultsAuditSnapshot,
  } = await server.ssrLoadModule("/src/app/lib/electionResults.ts");
  const { createComparisonRows } = await server.ssrLoadModule("/src/app/pages/Audit.tsx");

  window.localStorage.setItem(
    "zkvote.voterRegistrations",
    JSON.stringify([
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
    ]),
  );

  const preview = await buildRegistryPreview(currentElectionId);
  const staticSnapshot = await readOnChainElectionResults(makeContract(registryFixture.merkleRoot), provider);
  const dynamicSnapshot = await readOnChainElectionResults(makeContract(preview.merkleRootPreview), provider);
  const customSnapshot = await readOnChainElectionResults(makeContract("12345"), provider);
  const zeroSnapshot = await readOnChainElectionResults(makeContract("0"), provider);
  const staticAudit = buildResultsAuditSnapshot(staticSnapshot, 2);
  const dynamicAudit = buildResultsAuditSnapshot(dynamicSnapshot, 2);
  const customAudit = buildResultsAuditSnapshot(customSnapshot, 2);
  const zeroAudit = buildResultsAuditSnapshot(zeroSnapshot, 2);
  const staticValidation = validateResultsAuditSnapshot(staticAudit);
  const dynamicValidation = validateResultsAuditSnapshot(dynamicAudit);
  const customValidation = validateResultsAuditSnapshot(customAudit);
  const zeroValidation = validateResultsAuditSnapshot(zeroAudit);
  const oldAudit = { ...staticAudit };
  delete oldAudit.merkleRoot;
  delete oldAudit.demoMode;
  delete oldAudit.staticFixtureRoot;
  delete oldAudit.dynamicPreviewRoot;
  const oldAuditValidation = validateResultsAuditSnapshot(oldAudit);
  const privateFieldValidation = validateResultsAuditSnapshot({
    ...staticAudit,
    voterIdentity: "private",
    identityCommitment: "private",
    proof: "private",
    rawNullifier: "private",
    txHash: "private",
    walletAddress: "private",
    voteChoice: "private",
  });
  const comparisonRows = createComparisonRows(staticAudit, dynamicSnapshot);
  const exportFieldNames = collectJsonFieldNames(staticAudit);
  const forbiddenExportField = exportFieldNames.find((fieldName) =>
    forbiddenFieldParts.some((forbiddenPart) => fieldName.includes(forbiddenPart)),
  );

  const checks = [
    ["static fixture root export is STATIC_FIXTURE", staticAudit.demoMode === "STATIC_FIXTURE" && staticAudit.rootMatchesStaticFixture],
    ["dynamic preview root export is DYNAMIC_POSEIDON", dynamicAudit.demoMode === "DYNAMIC_POSEIDON" && dynamicAudit.rootMatchesDynamicPoseidon],
    ["custom root export warns", customAudit.demoMode === "CUSTOM" && customAudit.warnings.some((warning) => warning.includes("CUSTOM"))],
    ["zero root export warns", zeroAudit.demoMode === "UNSET" && zeroAudit.warnings.some((warning) => warning.includes("UNSET"))],
    ["static audit validates", staticValidation.isValid],
    ["dynamic audit validates", dynamicValidation.isValid],
    ["custom audit validates with warning", customValidation.isValid && customValidation.warnings.some((warning) => warning.includes("CUSTOM"))],
    ["zero audit validates with warning", zeroValidation.isValid && zeroValidation.warnings.some((warning) => warning.includes("UNSET"))],
    ["old audit JSON missing root metadata is rejected clearly", !oldAuditValidation.isValid && oldAuditValidation.errors.some((error) => error.includes("demo mode/Merkle root metadata"))],
    ["private audit fields are rejected", !privateFieldValidation.isValid && privateFieldValidation.errors.some((error) => error.includes("forbidden private fields"))],
    ["live comparison detects root mismatch", comparisonRows.some((row) => row.label === "Merkle root" && !row.matches)],
    ["live comparison detects mode mismatch", comparisonRows.some((row) => row.label === "Demo mode" && !row.matches)],
    ["export JSON excludes forbidden private fields", !forbiddenExportField],
  ];
  const failed = checks.filter(([, passed]) => !passed);

  console.log(JSON.stringify({
    passed: failed.length === 0,
    checks: checks.map(([name, passed]) => ({ name, passed })),
    staticMode: staticAudit.demoMode,
    dynamicMode: dynamicAudit.demoMode,
    customMode: customAudit.demoMode,
    zeroMode: zeroAudit.demoMode,
  }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await server.close();
}
