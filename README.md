# KLTN ZK Anonymous Verifiable Voting MVP

This repository is the foundation for a KLTN thesis MVP that demonstrates anonymous, verifiable voting with zero-knowledge proofs. The current vertical slice lets a registered voter prove Merkle membership off-chain, submit one private vote on-chain, prevent double voting with a nullifier, and publish a verifiable candidate tally.

The project is still intentionally scoped as an MVP foundation. Dynamic voter registration, production ceremonies, and frontend vote submission are future work.

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
- `frontend/`: Vite frontend foundation. Local contract metadata is exported to `frontend/src/contracts/election.local.json`; UI wiring is not implemented yet.

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

Deploy the local verifier and election contract:

```shell
npm run deploy:local
```

Submit the generated vote fixture to the local election:

```shell
npm run vote:local
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

## Local Metadata

`npm run deploy:local` writes:

- `deployments/local/election.json`: network name, chain ID, deployer, verifier address, election address, election ID, Merkle root, candidate bounds, timestamp, and public input order.
- `frontend/src/contracts/election.local.json`: the same metadata plus the `Election` ABI for future frontend integration.

Hardhat's in-process network is ephemeral between script runs. `scripts/vote-local.ts` validates the saved deployment metadata and recreates the same deterministic local contracts when needed before submitting the fixture vote.

## Current Roadmap

1. Keep the local Merkle registry, proof, deploy, and vote flow reproducible.
2. Record gas, proving, and constraint metrics for thesis evaluation.
3. Add frontend wiring for proof submission and results display.
4. Decide whether any post-MVP registry update flow is needed, or keep immutable root publication as the thesis scope.
5. Prepare production ceremony and deployment notes after the MVP flow stabilizes.

## Status

The current repository implements a local anonymous voting vertical slice for a fixed registry fixture. It is not a production election system.
