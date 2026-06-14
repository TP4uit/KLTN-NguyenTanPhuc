# KLTN ZK Anonymous Verifiable Voting MVP

This repository is the foundation for a KLTN thesis MVP that demonstrates anonymous, verifiable voting with zero-knowledge proofs. The current vertical slice lets a registered voter prove Merkle membership off-chain, submit one private vote on-chain, prevent double voting with a nullifier, and publish a verifiable candidate tally.

The project is still intentionally scoped as an MVP foundation. Dynamic voter registration, production ceremonies, and production browser-side proof generation are future work.

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
- `frontend/`: Vite frontend foundation. Local contract metadata is exported to `frontend/src/contracts/election.local.json`, browser-generated demo votes use proving assets under `frontend/public/zk/`, and the checked proof fixture remains available at `frontend/src/contracts/vote.calldata.local.json` as a fallback.

## Public Inputs

The current verifier and contract use this public input order:

```text
input[0] = nullifierHash
input[1] = candidateId
input[2] = electionId
input[3] = merkleRoot
```

MVP candidate IDs are valid only in the inclusive range `1..4`.

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

Deploy the local verifier and election contract. The local demo opens the election by default:

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

Use this flow when testing the Figma frontend with MetaMask.

Terminal 1:

```shell
npx hardhat node
```

Terminal 2:

```shell
npm run registry:generate && npm run proof:generate && npm run proof:calldata && npm run frontend:sync-fixtures && npm run deploy:localhost
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

Import one of the funded Hardhat test accounts from the `npx hardhat node` output if MetaMask does not already have a funded localhost account.

The Dashboard primary Vote buttons generate a fresh Groth16 proof in the browser for the selected candidate, then submit the generated Solidity calldata through MetaMask. A separate fixture fallback button still submits `frontend/src/contracts/vote.calldata.local.json` for candidate `1`. The browser-generated path uses `/zk/vote.wasm`, `/zk/vote_final.zkey`, and the local demo registry fixture. It still uses demo-only voter secret material and a precomputed local demo nullifier, so it is an MVP/demo flow rather than production identity or secret management.

`npm run deploy:localhost` auto-opens the election so browser voting works immediately. Set `LOCAL_ELECTION_AUTO_OPEN=false` to deploy and export metadata while staying in Registration. The Dashboard and Results pages display the live lifecycle state after MetaMask connects, and Dashboard refuses to submit votes unless the contract state is Open.

Admin demo flow:

```shell
# Terminal 2, while npm run node:local is running
$env:LOCAL_ELECTION_AUTO_OPEN='false'; npm run deploy:localhost; Remove-Item Env:LOCAL_ELECTION_AUTO_OPEN
```

Then open `/admin`, connect the Hardhat deployer/admin account in MetaMask, and use the Admin page to open the election. After that, use `/dashboard` to cast a browser-generated vote, `/results` to read the tally, and `/admin` again to close the election. Results remain readable after close, while Dashboard vote submission is blocked when the live lifecycle state is Closed.

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

## Current Roadmap

1. Keep the local Merkle registry, proof, deploy, and vote flow reproducible.
2. Keep the generated audit and benchmark evidence pack current as the MVP changes.
3. Harden browser-side proof generation beyond the current local/demo secret and nullifier fixture.
4. Decide whether any post-MVP registry update flow is needed, or keep immutable root publication as the thesis scope.
5. Prepare production ceremony and deployment notes after the MVP flow stabilizes.

## Status

The current repository implements a local anonymous voting vertical slice for a fixed registry fixture. It is not a production election system.
