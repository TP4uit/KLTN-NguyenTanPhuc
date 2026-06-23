# KLTN ZK Anonymous Verifiable Voting MVP

This repository is the foundation for a KLTN thesis MVP that demonstrates anonymous, verifiable voting with zero-knowledge proofs. The current vertical slice lets a demo voter prove Merkle membership, submit one private vote on-chain, prevent double voting with a nullifier, read live candidate tallies, and export public audit evidence.

The project is intentionally scoped as a local MVP/demo system. It now includes local demo auth, voter registration review, two admin-selected local root modes, guarded static/dynamic vote submission paths, Results audit export, public evidence package export, and auditor evidence package review. These flows are for thesis demonstration and local verification; they are not production identity management, production registration, or production election infrastructure.

## Architecture

- `contracts/Election.sol`: election contract that stores an immutable `electionId`, manages `Registration -> Open -> Closed`, finalizes a Merkle root before voting, calls the Groth16 verifier, rejects reused nullifiers, enforces candidate IDs 1..4, and tracks vote counts.
- `contracts/Verifier.sol`: generated Groth16 verifier from `snarkjs` for the current voting circuit.
- `circuits/vote.circom`: Circom circuit that proves `nullifierHash = Poseidon(secretKey, electionId)`, constrains candidate validity, computes `identityCommitment = Poseidon(secretKey)`, and verifies a depth-3 Merkle path against the public root.
- `scripts/merkle-registry.mjs` and `scripts/registry-generate.mjs`: deterministic off-chain registry builder and fixture generator.
- `scripts/proof-generate.mjs` and `scripts/proof-calldata.mjs`: local witness, proof, public signal, and Solidity calldata generation.
- `scripts/deploy-local.ts`: deploys `Groth16Verifier` and `Election` to a local Hardhat network and writes deployment metadata.
- `scripts/vote-local.ts`: reads the deployment metadata and calldata fixture, validates root/election ID consistency, submits `Election.castVote`, and prints transaction metrics.
- `ignition/modules/Election.ts`: Hardhat Ignition module for verifier-first election deployment.
- `test/Election.test.ts`: TypeScript integration tests for registry helpers, verifier-backed voting, invalid proof paths, replay prevention, and candidate bounds.
- `frontend/`: Vite frontend foundation. Local contract metadata is exported to `frontend/src/contracts/election.local.json`, browser-generated demo votes use proving assets under `frontend/public/zk/`, and the checked proof fixture remains available at `frontend/src/contracts/vote.calldata.local.json` as a fallback. The frontend also contains local demo auth, registration review, admin root/lifecycle controls, Results audit export, public evidence package export, and auditor package review.

## Public Inputs

The current verifier and contract use this public input order:

```text
input[0] = nullifierHash
input[1] = candidateId
input[2] = electionId
input[3] = merkleRoot
```

MVP candidate IDs are valid only in the inclusive range `1..4`.

## Frontend Demo Roles

The browser app uses local demo accounts and role guards. This state lives in browser storage and is not a production identity provider.

- `voter`: registers a local demo identity, waits for admin approval, and votes from `/dashboard` when the election is Open and the selected root mode is compatible.
- `admin`: reviews voter registrations, previews registry roots, chooses Static Fixture Mode or Dynamic Poseidon Mode, confirms `setMerkleRoot`, opens/closes the election, and can reset frontend-local demo state.
- `auditor`: imports Results audit JSON or a public evidence package in `/audit`, validates public fields, reviews root/mode alignment, and optionally compares the package against current localhost contract reads.

Seed demo accounts are restored by the frontend if local demo auth storage is empty. New voter accounts can also be created from `/register`.

## Supported Local Demo Modes

The MVP supports two local demo root modes. Both are intentionally local/demo flows.

- Static Fixture Mode uses the deterministic `registry.local.json` fixture root and the seeded fixture voter path. It is closest to the original fixed-registry proof fixture and supports the static Dashboard submit path.
- Dynamic Poseidon Mode uses the admin Registry Preview root built from approved local `POSEIDON` and `FIXTURE_POSEIDON` identity commitments. It supports guarded Dynamic submit only when the contract root equals the preview root, the election is Open, matching proof inputs can be derived, and the current UI session has not already voted.

Approved `SHA256_DEMO` registrations are shown as incompatible with Dynamic Poseidon Mode. Public approved `identityCommitment` values may appear in registration/registry evidence as public registry commitments, but identity secrets, passwords, proofs, raw nullifiers, vote choices, transaction hashes, and wallet/private data are not exported.

## Demo and Thesis Documentation

- [Demo runbook](docs/DEMO_RUNBOOK.md): step-by-step Static Fixture Mode, Dynamic Poseidon Mode, Results/Audit, evidence package review, and reset flows.
- [Thesis demo mapping](docs/THESIS_DEMO_MAPPING.md): implemented MVP features mapped to thesis sections, files, routes, verification evidence, screenshots, and limitations.
- [Screenshot checklist](docs/SCREENSHOT_CHECKLIST.md): thesis/demo screenshots to capture with page route, role, expected state, and Vietnamese captions.
- [Final verification checklist](docs/FINAL_VERIFICATION_CHECKLIST.md): final automated commands, manual browser checks, and limitation checklist before recording or submission.

## Setup

Install root Hardhat dependencies:

```shell
npm install
```

Install frontend dependencies when working on the UI:

```shell
cd frontend
npm install
```

## Commands

Run the full Hardhat test suite:

```shell
npm test
```

Compile contracts and refresh artifacts:

```shell
npm run build
```

Typecheck Hardhat scripts, tests, and deployment modules:

```shell
npm run typecheck
```

Generate the deterministic registry fixture:

```shell
npm run registry:generate
```

Generate a local proof fixture and Solidity calldata:

```shell
npm run proof:generate
npm run proof:calldata
```

Sync frontend-local proof fixtures and browser proving assets:

```shell
npm run frontend:sync-fixtures
```

Deploy the local verifier and election contract. The local script opens the election by default:

```shell
npm run deploy:local
```

Deploy to a persistent Hardhat node for MetaMask. This also opens the election by default:

```shell
npm run deploy:localhost
```

To leave a local deployment in Registration for lifecycle testing, set `LOCAL_ELECTION_AUTO_OPEN=false` before running the deploy script.

Submit the generated vote fixture to the local election:

```shell
npm run vote:local
```

Submit the generated vote fixture through the persistent localhost RPC:

```shell
npm run vote:localhost
```

Run the local fixture, deployment, and vote workflow together:

```shell
npm run e2e:local
```

Run the audit and benchmark evidence pack:

```shell
npm run evidence:all
```

Individual evidence commands are also available:

```shell
npm run audit:registry
npm run audit:proof
npm run audit:calldata
npm run benchmark:proof
npm run benchmark:gas
```

Run scoped test layers:

```shell
npm run test:mocha
npm run test:solidity
```

Start the frontend:

```shell
cd frontend
npm run dev
```

## Local Browser Flow

Use this flow when testing the frontend with MetaMask. For the admin lifecycle and root-mode demo, deploy with `LOCAL_ELECTION_AUTO_OPEN=false` so `/admin` can set the desired root and open the election intentionally.

Terminal 1:

```shell
npm run node:local
```

Terminal 2:

```shell
npm run registry:generate
npm run proof:generate
npm run proof:calldata
npm run frontend:sync-fixtures
$env:LOCAL_ELECTION_AUTO_OPEN='false'; npm run deploy:localhost; Remove-Item Env:LOCAL_ELECTION_AUTO_OPEN
```

Terminal 3:

```shell
cd frontend
npm install
npm run dev
```

In MetaMask, add or select the localhost network:

- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Import one of the funded Hardhat test accounts from the `npm run node:local` output if MetaMask does not already have a funded localhost account.

Recommended browser path:

1. Sign in as an admin demo account.
2. Open `/admin`, connect the Hardhat deployer/admin account in MetaMask, review pending registrations, and inspect Registry Preview / Dynamic Proof Input Preview if needed.
3. Choose the intended local demo mode:
   - Static Fixture Mode: fill the static fixture root, confirm `setMerkleRoot`, then confirm `openElection`.
   - Dynamic Poseidon Mode: approve Poseidon-compatible registrations, fill the dynamic Poseidon preview root, confirm `setMerkleRoot`, then confirm `openElection`.
4. Sign in as a voter and open `/dashboard`. Static submit uses the fixture-compatible path. Dynamic submit is enabled only when all Dynamic Poseidon readiness checks pass.
5. Open `/results` to read on-chain tallies, Merkle root, and demo mode. Export the Results audit JSON or the public evidence package.
6. Sign in as an auditor or admin and open `/audit`. Import the Results audit JSON or public evidence package, review validation checks, and optionally run live comparison against the current localhost contract.

The Dashboard and Results pages display the live lifecycle state after MetaMask connects. Dashboard refuses to submit votes unless the contract state is Open. Results remain readable after close, while voting is blocked once the live lifecycle state is Closed.

## Local Metadata

`npm run deploy:local` writes:

- `deployments/local/election.json`: network name, chain ID, deployer, verifier address, election address, election ID, Merkle root, election lifecycle state, auto-open flag, candidate bounds, timestamp, and public input order.
- `frontend/src/contracts/election.local.json`: the same metadata plus the `Election` ABI for frontend integration.
- `frontend/src/contracts/vote.calldata.local.json`: the fixture proof calldata exported by `npm run proof:calldata` or `npm run frontend:sync-fixtures`.
- `frontend/src/contracts/registry.local.json`: selected local demo voter secret, precomputed demo nullifier, Merkle path, path indices, and Merkle root. This file is demo-only and must not be used for production secret management.
- `frontend/public/zk/vote.wasm` and `frontend/public/zk/vote_final.zkey`: copied proving assets for the browser proof-generation scaffold.

Hardhat's in-process network is ephemeral between script runs. `scripts/vote-local.ts` validates the saved deployment metadata, recreates the same deterministic local contracts when needed, opens the recreated election when metadata says `autoOpened: true`, and refuses to submit unless the live contract state is Open. For MetaMask, keep `npx hardhat node` running and use `deploy:localhost` plus `vote:localhost`.

## Evidence Reports

`npm run evidence:all` regenerates machine-readable reports under `reports/evidence/` and writes the thesis-facing summary to `docs/BENCHMARK_REPORT.md`.

The current evidence pack records registry root recomputation, Groth16 proof verification, calldata consistency, deployment lifecycle metadata checks, R1CS metrics, artifact sizes, local proof timings, deployment gas, `openElection`/`closeElection` gas, valid vote gas, and expected lifecycle/proof rejection behavior. Reverted paths record readable reasons, but the current local ethers/Hardhat error objects do not expose failed-path gas receipts.

Frontend Results audit JSON and public evidence packages are separate browser exports. They combine current contract reads with frontend-local demo registration/registry evidence for review in `/audit`; they are public demo evidence only, not cryptographic proof of per-vote provenance.

## Current Roadmap

1. Keep the local Merkle registry, proof, deploy, and vote flow reproducible.
2. Keep the generated audit and benchmark evidence pack current as the MVP changes.
3. Keep the frontend demo runbook aligned with Static Fixture Mode, Dynamic Poseidon Mode, Results audit export, and evidence package review.
4. Harden browser-side proof generation, identity storage, and registration beyond the current local/demo model before any production design.
5. Prepare production ceremony, deployment, identity, and registry update notes only after the MVP flow stabilizes.

## Status

The current repository implements a local anonymous voting MVP with fixed fixture and dynamic Poseidon demo modes, admin-reviewed local registrations, guarded vote submission, public Results audit export, public evidence package export, and auditor review. It is not a production election system.
