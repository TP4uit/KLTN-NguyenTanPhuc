# Project Notes

## Current State

- The repository has moved past a plain Hardhat starter and already contains an `Election` contract, a generated Groth16 verifier, Circom artifacts, a Vite frontend foundation, and an Ignition module.
- `contracts/Election.sol` currently supports verifier-based vote submission, public nullifier tracking, and candidate vote counts.
- `circuits/vote.circom` currently proves that a private secret hashes to a public nullifier. It does not yet prove Merkle membership or candidate validity.
- Some existing source comments appear to have text encoding damage. This cleanup is intentionally left out of the foundation pass to avoid changing behavior.

## Known Gaps

- No Merkle identity registry is implemented yet.
- No end-to-end valid proof fixture is wired into the TypeScript tests.
- Candidate validity is not constrained in the circuit or checked by Solidity.
- Metrics for constraints, proving time, deployment gas, and vote gas are not collected yet.

## Verification Log

Commands run during the foundation pass:

- `npm install`
  - Result: Passed.
  - Notes: Installed root dependencies from the existing lockfile. `npm audit` reported 25 vulnerabilities: 9 low, 10 moderate, and 6 high.

- `npm run build`
  - Result: Passed.
  - Final output: `No contracts to compile`.
  - Notes: The first successful build compiled 2 Solidity files and refreshed tracked Hardhat artifact/cache metadata.

- `npm test`
  - Result: Passed.
  - Final output: 2 passing Mocha tests.
  - Notes: `npm test` now runs the real Hardhat test task instead of the starter placeholder.

- `npm run typecheck`
  - Result: Passed.
  - Final output: `tsc --noEmit` completed without errors.

## Resolved During Foundation Pass

- Root dependencies were initially missing locally, so `hardhat` and `tsc` were not available until `npm install` was run.
- `test/Election.test.ts` used the old `hre.ethers` access pattern. It now uses Hardhat 3 `network.create()`, `ethers.deployContract`, and `networkHelpers.loadFixture`.
- Root `tsconfig.json` initially attempted to typecheck the separate frontend package with the Hardhat TypeScript settings. It now scopes root typechecking to Hardhat config, scripts, deployment modules, and tests.

## Remaining Blockers

- No checked-in valid proof fixture exists yet, so tests do not cover `castVote`.
- Merkle membership, candidate validity constraints, and election-specific nullifier derivation are still planned work.
- Gas, proving time, and constraint metrics are still pending.
- Avoid running `hardhat build` and `hardhat test` concurrently in the same working tree; a parallel verification attempt caused a transient Hardhat build-info file move error.
