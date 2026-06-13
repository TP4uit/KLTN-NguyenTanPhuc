import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildRegistryFixture, DEFAULT_SELECTED_VOTER_INDEX } from "./merkle-registry.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = resolve(rootDir, "test", "fixtures", "registry");
const fixturePath = resolve(fixtureDir, "registry.json");
const selectedVoterIndex = Number(
  process.env.REGISTRY_SELECTED_VOTER_INDEX ?? DEFAULT_SELECTED_VOTER_INDEX,
);

mkdirSync(fixtureDir, { recursive: true });

const fixture = await buildRegistryFixture({ selectedVoterIndex });

writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);

console.log("Generated Merkle registry fixture");
console.log(`  fixture: ${fixturePath}`);
console.log(`  treeDepth: ${fixture.treeDepth}`);
console.log(`  leafCount: ${fixture.leafCount}`);
console.log(`  hashFunction: ${fixture.hashFunction}`);
console.log(`  selectedVoterIndex: ${fixture.selectedVoterIndex}`);
console.log(`  selectedIdentityCommitment: ${fixture.selectedIdentityCommitment}`);
console.log(`  merkleRoot: ${fixture.merkleRoot}`);
