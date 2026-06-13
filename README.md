# KLTN ZK Anonymous Verifiable Voting MVP

This repository is the foundation for a KLTN thesis MVP that demonstrates anonymous, verifiable voting with zero-knowledge proofs. The target system lets an eligible voter prove membership in a voter registry, submit one private vote, prevent double voting with a nullifier, and publish a verifiable tally on-chain.

The project is intentionally not a full voting system yet. It keeps the current Solidity, Circom, Hardhat, and frontend foundations in place while documenting the remaining MVP milestones.

## Architecture

- `contracts/Election.sol`: election contract that accepts Groth16 proofs, tracks used nullifiers, and counts votes by candidate ID.
- `contracts/Verifier.sol`: generated Groth16 verifier from `snarkjs`.
- `circuits/vote.circom`: current voting circuit foundation. It verifies a private secret against a public nullifier and is planned to grow into Merkle membership and vote validity constraints.
- `ignition/modules/Election.ts`: Hardhat Ignition deployment module that deploys the verifier first, then the election contract.
- `test/Election.test.ts`: TypeScript integration tests for deployment and initial state.
- `frontend/`: Vite frontend foundation for the voter and results experience.
- `docs/KLTN_CHECKLIST.md`: thesis requirement checklist mapped to implementation tasks.
- `PLAN.md`, `EXPERIMENTS.md`, `NOTES.md`: long-running planning, metrics, and project notes.

## MVP Requirements

- Merkle identity registry for eligible voter commitments.
- ZK membership proof proving the voter is registered without revealing identity.
- Nullifier-based double-voting prevention.
- Vote validity constraint for allowed candidates.
- Solidity verifier integration.
- End-to-end flow from proof generation to vote submission and tally.
- Gas, proving time, and circuit constraint metrics for thesis evaluation.

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

Run the Solidity/TypeScript test suite:

```shell
npm test
```

Compile contracts and generate Hardhat artifacts:

```shell
npm run build
```

Run scoped test layers:

```shell
npm run test:mocha
npm run test:solidity
```

Typecheck TypeScript after a successful build:

```shell
npm run typecheck
```

Deploy locally with Ignition:

```shell
npx hardhat ignition deploy ignition/modules/Election.ts --network hardhatMainnet
```

Start the frontend:

```shell
cd frontend
npm run dev
```

## Current Roadmap

1. Stabilize the Hardhat test workflow and record blockers in `NOTES.md`.
2. Define the final circuit public/private inputs.
3. Add Merkle membership constraints and regenerate proving/verifier artifacts.
4. Add Solidity support for registry roots and candidate validity.
5. Add proof generation and vote submission scripts.
6. Add end-to-end tests with valid and invalid proofs.
7. Record gas, proving, and constraint metrics in `EXPERIMENTS.md`.

## Status

This pass creates the project foundation and tracking files only. It does not implement the full anonymous voting protocol.
