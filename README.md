# KLTN ZK Anonymous Verifiable Voting MVP

This repository is the foundation for a KLTN thesis MVP that demonstrates anonymous, verifiable voting with zero-knowledge proofs. The current vertical slice lets a registered voter prove Merkle membership off-chain, submit one private vote on-chain, prevent double voting with a nullifier, and publish a verifiable candidate tally.

The project is still intentionally scoped as an MVP foundation. Dynamic voter registration, production ceremonies, and production browser-side proof generation are future work.

## Architecture

- `contracts/Election.sol`: election contract that stores an immutable `electionId` and `merkleRoot`, calls the Groth16 verifier, rejects reused nullifiers, enforces candidate IDs 1..4, and tracks vote counts.
- `contracts/Verifier.sol`: generated Groth16 verifier from `snarkjs` for the current voting circuit.
- `circuits/vote.circom`: Circom circuit that proves `nullifierHash = Poseidon(secretKey, electionId)`, constrains candidate validity, computes `identityCommitment = Poseidon(secretKey)`, and verifies a depth-3 Merkle path against the public root.
- `scripts/merkle-registry.mjs` and `scripts/registry-generate.mjs`: deterministic off-chain registry builder and fixture generator.
- `scripts/proof-generate.mjs` and `scripts/proof-calldata.mjs`: local witness, proof, public signal, and Solidity calldata generation.
- `scripts/deploy-local.ts`: deploys `Groth16Verifier` and `Election` to a local Hardhat network and writes deployment metadata.
- `scripts/vote-local.ts`: reads the deployment metadata and calldata fixture, validates root/election ID consistency, submits `Election.castVote`, and prints transaction metrics.
- `ignition/modules/Election.ts`: Hardhat Ignition module for verifier-first election deployment.
- `test/Election.test.ts`: TypeScript integration tests for registry helpers, verifier-backed voting, invalid proof paths, replay prevention, and candidate bounds.
- `frontend/`: Vite frontend foundation. Local contract metadata is exported to `frontend/src/contracts/election.local.json`, the checked proof fixture is exported to `frontend/src/contracts/vote.calldata.local.json`, and demo proving assets are synced under `frontend/public/zk/` for browser-proof scaffolding.

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

Deploy the local verifier and election contract:

```shell
npm run deploy:local
```

Deploy to a persistent Hardhat node for MetaMask:

```shell
npm run deploy:localhost
```

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

The stable demo path still submits the checked fixture proof from `frontend/src/contracts/vote.calldata.local.json`, so the default fixture vote is bound to candidate `1`. The Dashboard also has a small developer action that calls SnarkJS in the browser with `/zk/vote.wasm`, `/zk/vote_final.zkey`, and the local demo registry fixture. That scaffold uses a precomputed local demo nullifier for the selected fixture voter, is for proving-path validation only, and does not replace fixture voting yet.

## Local Metadata

`npm run deploy:local` writes:

- `deployments/local/election.json`: network name, chain ID, deployer, verifier address, election address, election ID, Merkle root, candidate bounds, timestamp, and public input order.
- `frontend/src/contracts/election.local.json`: the same metadata plus the `Election` ABI for frontend integration.
- `frontend/src/contracts/vote.calldata.local.json`: the fixture proof calldata exported by `npm run proof:calldata` or `npm run frontend:sync-fixtures`.
- `frontend/src/contracts/registry.local.json`: selected local demo voter secret, precomputed demo nullifier, Merkle path, path indices, and Merkle root. This file is demo-only and must not be used for production secret management.
- `frontend/public/zk/vote.wasm` and `frontend/public/zk/vote_final.zkey`: copied proving assets for the browser proof-generation scaffold.

Hardhat's in-process network is ephemeral between script runs. `scripts/vote-local.ts` validates the saved deployment metadata and recreates the same deterministic local contracts when needed before submitting the fixture vote. For MetaMask, keep `npx hardhat node` running and use `deploy:localhost` plus `vote:localhost`.

## Current Roadmap

1. Keep the local Merkle registry, proof, deploy, and vote flow reproducible.
2. Record gas, proving, and constraint metrics for thesis evaluation.
3. Harden browser-side proof generation beyond the current local/demo scaffold.
4. Decide whether any post-MVP registry update flow is needed, or keep immutable root publication as the thesis scope.
5. Prepare production ceremony and deployment notes after the MVP flow stabilizes.

## Status

The current repository implements a local anonymous voting vertical slice for a fixed registry fixture. It is not a production election system.
