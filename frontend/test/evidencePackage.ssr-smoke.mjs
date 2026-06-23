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
    return 456;
  },
};

try {
  const { currentElectionId } = await server.ssrLoadModule("/src/app/lib/localVoterRegistration.ts");
  const { buildRegistryPreview } = await server.ssrLoadModule("/src/app/lib/registryPreview.ts");
  const {
    buildResultsAuditSnapshot,
    readOnChainElectionResults,
  } = await server.ssrLoadModule("/src/app/lib/electionResults.ts");
  const {
    buildDemoEvidencePackage,
    collectForbiddenDemoEvidencePackagePaths,
    validateDemoEvidencePackage,
  } = await server.ssrLoadModule("/src/app/lib/demoEvidencePackage.ts");
  const {
    buildEvidencePackageReviewReport,
    createComparisonRows,
    getEvidencePackageVerdict,
    validateAuditImport,
  } = await server.ssrLoadModule("/src/app/pages/Audit.tsx");

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
  const staticAudit = buildResultsAuditSnapshot(staticSnapshot, 2);
  const dynamicAudit = buildResultsAuditSnapshot(dynamicSnapshot, 2);
  const staticPackage = await buildDemoEvidencePackage(staticAudit);
  const dynamicPackage = await buildDemoEvidencePackage(dynamicAudit);
  const staticPackageValidation = validateDemoEvidencePackage(staticPackage);
  const dynamicPackageValidation = validateDemoEvidencePackage(dynamicPackage);
  const rawAuditImport = validateAuditImport(staticAudit);
  const packageImport = validateAuditImport(dynamicPackage);
  const comparisonRows = createComparisonRows(packageImport.auditSnapshot, staticSnapshot);
  const privatePackageValidation = validateDemoEvidencePackage({
    ...dynamicPackage,
    proof: "private",
    rawNullifier: "private",
    txHash: "private",
    walletAddress: "private",
  });
  const misplacedCommitmentValidation = validateDemoEvidencePackage({
    ...dynamicPackage,
    identityCommitment: "not-allowed-here",
  });
  const publicFieldScan = collectForbiddenDemoEvidencePackagePaths(dynamicPackage);
  const reviewReportBeforeComparison = buildEvidencePackageReviewReport({
    evidencePackage: dynamicPackage,
    packageValidation: dynamicPackageValidation,
  });
  const reviewReportAfterComparison = buildEvidencePackageReviewReport({
    evidencePackage: dynamicPackage,
    packageValidation: dynamicPackageValidation,
    comparisonRows,
  });
  const invalidReviewReport = buildEvidencePackageReviewReport({
    evidencePackage: {
      ...dynamicPackage,
      walletAddress: "private",
    },
    packageValidation: privatePackageValidation,
    comparisonRows,
  });
  const reportForbiddenFields = collectForbiddenDemoEvidencePackagePaths(reviewReportAfterComparison);
  const invalidReportForbiddenFields = collectForbiddenDemoEvidencePackagePaths(invalidReviewReport);

  const checks = [
    ["static package includes resultsAudit", staticPackage.resultsAudit?.demoMode === "STATIC_FIXTURE"],
    ["static package includes registrationEvidence", staticPackage.registrationEvidence?.approvedCount === 2],
    ["static package includes registryPreview", staticPackage.registryPreview?.hashFunction === "Poseidon"],
    ["static package includes demoMode and merkleRoot", staticPackage.demoMode === staticAudit.demoMode && staticPackage.merkleRoot === staticAudit.merkleRoot],
    ["static fixture root check is true for static package", staticPackage.checks.staticFixtureRootMatchesResultsRoot],
    ["registry preview root check is false for static package", !staticPackage.checks.registryPreviewRootMatchesResultsRoot],
    ["dynamic registry preview root check is true", dynamicPackage.checks.registryPreviewRootMatchesResultsRoot],
    ["dynamic static fixture root check is false", !dynamicPackage.checks.staticFixtureRootMatchesResultsRoot],
    ["public identityCommitments are allowed in evidence sections", publicFieldScan.length === 0],
    ["static package validates", staticPackageValidation.isValid],
    ["dynamic package validates", dynamicPackageValidation.isValid],
    ["private package fields are rejected", !privatePackageValidation.isValid && privatePackageValidation.errors.some((error) => error.includes("forbidden private fields"))],
    ["identityCommitment outside evidence sections is rejected", !misplacedCommitmentValidation.isValid && misplacedCommitmentValidation.errors.some((error) => error.includes("forbidden private fields"))],
    ["Audit import accepts raw Results audit JSON", rawAuditImport.validation.isValid && rawAuditImport.auditSnapshot?.demoMode === "STATIC_FIXTURE" && rawAuditImport.packageValidation === null],
    ["Audit import accepts full evidence package", packageImport.packageValidation?.isValid && packageImport.auditSnapshot?.demoMode === "DYNAMIC_POSEIDON"],
    ["live comparison works from package import", comparisonRows.some((row) => row.label === "Merkle root" && !row.matches)],
    ["package review report includes package metadata", reviewReportBeforeComparison.packageMetadata.packageVersion === dynamicPackage.packageVersion && reviewReportBeforeComparison.packageMetadata.electionId === currentElectionId],
    ["package review report includes checks", reviewReportBeforeComparison.checks.registryPreviewRootMatchesResultsRoot === true],
    ["valid package with warnings verdict is computed", getEvidencePackageVerdict(dynamicPackageValidation) === "Valid with warnings" && reviewReportBeforeComparison.verdict === "Valid with warnings"],
    ["invalid package verdict is computed", invalidReviewReport.verdict === "Invalid package" && invalidReviewReport.errors.length > 0 && invalidReviewReport.warnings.length > 0],
    ["invalid report exposes errors before warnings structurally", Object.keys(invalidReviewReport).indexOf("errors") < Object.keys(invalidReviewReport).indexOf("warnings")],
    ["normalized review report excludes forbidden private field keys", reportForbiddenFields.length === 0 && invalidReportForbiddenFields.length === 0],
    ["review report includes live comparison after comparison", reviewReportAfterComparison.liveComparison?.rows.length === comparisonRows.length && reviewReportAfterComparison.liveComparison?.allMatched === false],
  ];
  const failed = checks.filter(([, passed]) => !passed);

  console.log(JSON.stringify({
    passed: failed.length === 0,
    checks: checks.map(([name, passed]) => ({ name, passed })),
    staticPackageMode: staticPackage.demoMode,
    dynamicPackageMode: dynamicPackage.demoMode,
    dynamicPackageChecks: dynamicPackage.checks,
    reviewVerdict: reviewReportBeforeComparison.verdict,
    reviewReportHasLiveComparison: Boolean(reviewReportAfterComparison.liveComparison),
  }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
} finally {
  await server.close();
}
