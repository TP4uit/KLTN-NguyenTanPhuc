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
  const summary = {
    passed: diagnostics.passed,
    compatibleLeafCount: diagnostics.preview.compatibleLeafCount,
    incompatibleLeafCount: diagnostics.preview.incompatibleLeafCount,
    includedSchemes: diagnostics.preview.leaves.map((leaf) => leaf.commitmentScheme),
    incompatibleSchemes: diagnostics.preview.incompatibleLeaves.map((leaf) => leaf.commitmentScheme),
    checks: diagnostics.checks,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!diagnostics.passed) {
    process.exitCode = 1;
  }
} finally {
  await server.close();
}
