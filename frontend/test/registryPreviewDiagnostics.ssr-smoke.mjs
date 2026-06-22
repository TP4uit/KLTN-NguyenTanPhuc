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

try {
  const { currentElectionId } = await server.ssrLoadModule("/src/app/lib/localVoterRegistration.ts");
  const { runRegistryPreviewDiagnostics } = await server.ssrLoadModule(
    "/src/app/lib/registryPreviewDiagnostics.ts",
  );
  const { buildRegistryPreview } = await server.ssrLoadModule("/src/app/lib/registryPreview.ts");
  const {
    buildDemoModeReadiness,
    classifyDemoModeRoot,
  } = await server.ssrLoadModule("/src/app/lib/demoModeReadiness.ts");

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
      {
        id: "registration-old-sha",
        userId: "old-voter",
        electionId: currentElectionId,
        status: "APPROVED",
        identityCommitment: "abcdef123456",
        createdAt: "2026-06-22T00:00:00.000Z",
        reviewedAt: "2026-06-22T00:01:00.000Z",
      },
    ]),
  );

  const diagnostics = await runRegistryPreviewDiagnostics();
  const registryPreview = await buildRegistryPreview(currentElectionId);
  const staticMode = await buildDemoModeReadiness(registryFixture.merkleRoot, 0);
  const dynamicMode = await buildDemoModeReadiness(registryPreview.merkleRootPreview, 0);
  const customMode = await buildDemoModeReadiness("12345", 0);
  const unsetMode = await buildDemoModeReadiness("0", 0);
  const modeChecks = [
    ["active mode detects static fixture root", staticMode.activeMode === "STATIC_FIXTURE" && staticMode.staticModeReady],
    ["active mode detects dynamic preview root", dynamicMode.activeMode === "DYNAMIC_POSEIDON" && dynamicMode.dynamicModeReady],
    ["custom root warns about both submit paths", customMode.activeMode === "CUSTOM" && customMode.warnings.some((warning) => warning.includes("both demo submit paths"))],
    ["zero root is unset and warned", unsetMode.activeMode === "UNSET" && unsetMode.warnings.some((warning) => warning.includes("empty or zero"))],
    ["classifyDemoModeRoot detects static fixture", (await classifyDemoModeRoot(registryFixture.merkleRoot)) === "STATIC_FIXTURE"],
    ["classifyDemoModeRoot detects dynamic preview", (await classifyDemoModeRoot(registryPreview.merkleRootPreview)) === "DYNAMIC_POSEIDON"],
  ];
  const modeFailures = modeChecks.filter(([, passed]) => !passed);
  const summary = {
    passed: diagnostics.passed && modeFailures.length === 0,
    compatibleLeafCount: diagnostics.preview.compatibleLeafCount,
    incompatibleLeafCount: diagnostics.preview.incompatibleLeafCount,
    includedSchemes: diagnostics.preview.leaves.map((leaf) => leaf.commitmentScheme),
    incompatibleSchemes: diagnostics.preview.incompatibleLeaves.map((leaf) => leaf.commitmentScheme),
    checks: [
      ...diagnostics.checks,
      ...modeChecks.map(([name, passed]) => ({ name, passed })),
    ],
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.passed) {
    process.exitCode = 1;
  }
} finally {
  await server.close();
}
