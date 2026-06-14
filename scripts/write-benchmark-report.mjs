import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  evidenceDir,
  publicInputOrder,
  readJson,
  rootDir,
} from "./evidence-lib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const proofBenchmarkPath = resolve(evidenceDir, "proof-benchmark.json");
const gasBenchmarkPath = resolve(evidenceDir, "gas-benchmark.json");
const auditProofPath = resolve(evidenceDir, "audit-proof.json");
const auditRegistryPath = resolve(evidenceDir, "audit-registry.json");
const auditCalldataPath = resolve(evidenceDir, "audit-calldata.json");
const reportPath = resolve(rootDir, "docs", "BENCHMARK_REPORT.md");

function loadOptional(path, label) {
  return existsSync(path) ? readJson(path, label) : null;
}

function formatBytes(size) {
  if (size === null || size === undefined) {
    return "missing";
  }

  return `${size.toLocaleString("en-US")} bytes`;
}

function status(value) {
  return value ? "PASS" : "FAIL";
}

function rejectionResult(rejection) {
  if (rejection?.reverted !== true) {
    return "n/a";
  }

  return `reverted (${rejection.reason})${rejection.gasUsed ? `, gas ${rejection.gasUsed}` : ""}`;
}

const proofBenchmark = loadOptional(proofBenchmarkPath, "proof benchmark");
const gasBenchmark = loadOptional(gasBenchmarkPath, "gas benchmark");
const auditProof = loadOptional(auditProofPath, "proof audit");
const auditRegistry = loadOptional(auditRegistryPath, "registry audit");
const auditCalldata = loadOptional(auditCalldataPath, "calldata audit");
const generatedAt = new Date().toISOString();

const artifactRows = proofBenchmark === null
  ? "| Artifact | Size |\n| --- | --- |\n| Proof benchmark | missing |\n"
  : [
      "| Artifact | Size |",
      "| --- | --- |",
      ...Object.entries(proofBenchmark.artifactSizes).map(
        ([name, entry]) => `| ${name} | ${formatBytes(entry.bytes)} |`,
      ),
    ].join("\n");

const circuit = proofBenchmark?.circuit?.r1csInfo ?? {};
const proofWorkflow = proofBenchmark?.proofWorkflow ?? {};
const gas = gasBenchmark?.deployments ?? {};
const lifecycle = gasBenchmark?.lifecycle ?? {};
const tx = gasBenchmark?.transactions ?? {};
const rejections = tx.rejections ?? {};

const markdown = `# Benchmark and Audit Report

Generated: ${generatedAt}

This report summarizes reproducible evidence for the current KLTN ZK voting MVP. Machine-readable reports live under \`reports/evidence/\`.

## Public Input Order

\`\`\`text
${publicInputOrder.map((name, index) => `input[${index}] = ${name}`).join("\n")}
\`\`\`

## Circuit Metrics

| Metric | Value |
| --- | --- |
| Curve | ${circuit.curve ?? "n/a"} |
| Wires | ${circuit.wires ?? "n/a"} |
| Constraints | ${circuit.constraints ?? "n/a"} |
| Private inputs | ${circuit.private_inputs ?? "n/a"} |
| Public inputs | ${circuit.public_inputs ?? "n/a"} |
| Labels | ${circuit.labels ?? "n/a"} |
| Outputs | ${circuit.outputs ?? "n/a"} |

## Artifact Sizes

${artifactRows}

## Proof Generation Benchmark

| Step | Time |
| --- | --- |
| Witness generation | ${proofWorkflow.witnessGenerationMs ?? "n/a"} ms |
| Groth16 proving | ${proofWorkflow.groth16ProvingMs ?? "n/a"} ms |
| Solidity calldata export | ${proofWorkflow.calldataExportMs ?? "n/a"} ms |
| Total proof workflow | ${proofWorkflow.totalProofWorkflowMs ?? "n/a"} ms |
| Benchmark command total | ${proofWorkflow.totalMeasuredMs ?? "n/a"} ms |

## Election Lifecycle Benchmark

| Step | Value |
| --- | --- |
| Initial state | ${lifecycle.initialState?.name ?? "n/a"} (${lifecycle.initialState?.value ?? "n/a"}) |
| openElection gas | ${lifecycle.openElection?.gasUsed ?? "n/a"} |
| State after openElection | ${lifecycle.afterOpenState?.name ?? "n/a"} (${lifecycle.afterOpenState?.value ?? "n/a"}) |
| Vote before Open | ${rejectionResult(rejections.voteBeforeOpen)} |
| closeElection gas | ${lifecycle.closeElection?.gasUsed ?? "n/a"} |
| State after closeElection | ${lifecycle.afterCloseState?.name ?? "n/a"} (${lifecycle.afterCloseState?.value ?? "n/a"}) |
| Vote after Closed | ${rejectionResult(rejections.voteAfterClosed)} |

## Gas Benchmark

| Operation | Gas / Result |
| --- | --- |
| Groth16Verifier deployment | ${gas.verifier?.gasUsed ?? "n/a"} |
| Election deployment | ${gas.election?.gasUsed ?? "n/a"} |
| Valid castVote | ${tx.validCastVote?.gasUsed ?? "n/a"} |
| Duplicate nullifier | ${rejectionResult(rejections.duplicate)} |
| Invalid candidate | ${rejectionResult(rejections.invalidCandidate)} |
| Invalid Merkle root | ${rejectionResult(rejections.invalidMerkleRoot)} |
| Invalid proof | ${rejectionResult(rejections.invalidProof)} |

## Audit Results

| Audit | Result |
| --- | --- |
| Registry recomputation | ${status(auditRegistry?.passed)} |
| Proof verification | ${status(auditProof?.passed)} |
| Calldata consistency | ${status(auditCalldata?.passed)} |

## Environment Notes

- Node: ${proofBenchmark?.environment?.node ?? process.version}
- Platform: ${proofBenchmark?.environment?.platform ?? process.platform}
- Architecture: ${proofBenchmark?.environment?.arch ?? process.arch}
- Hardhat gas benchmark network: ${gasBenchmark?.environment?.hardhatNetwork ?? "default"}

## Known Limitations

- Browser proof submission is MVP/demo only. The frontend uses local demo registry material and a precomputed local demo nullifier.
- Production identity storage, voter registration, and key management are not implemented.
- Dynamic on-chain Merkle insertion is not implemented; the MVP finalizes the Merkle root through the election lifecycle before voting opens.
- Gas measurements are from a local Hardhat development network and are intended for thesis comparison, not production cost prediction.
- Reverted transaction paths record revert reasons. The local ethers/Hardhat error objects may not expose gas receipts for failed estimates.
- Groth16 proof bytes are randomized across proof generation runs while public signals remain stable for the same inputs.
`;

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, markdown);
console.log(`Benchmark report written: ${reportPath}`);
