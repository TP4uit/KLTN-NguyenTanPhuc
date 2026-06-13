# KLTN MVP Checklist

This checklist maps the anonymous verifiable voting MVP to the thesis requirements. It tracks the expected deliverables without treating the current repository as complete.

## Merkle Identity Registry

- [x] Define voter identity commitment format.
- [x] Select Merkle tree depth and hash function for the registry.
- [x] Add off-chain registry builder scripts under `scripts/` or `circuits/`.
- [x] Store and publish the election Merkle root on-chain.
- [ ] Add tests for root updates, invalid roots, and registry immutability during an election.

Current foundation:

- MVP identity commitments use `identityCommitment = Poseidon(secretKey)`.
- The off-chain registry helper builds a fixed depth-3 Poseidon tree with 8 leaves.
- `scripts/merkle-registry.mjs` contains reusable tree/proof helpers.
- `scripts/registry-generate.mjs` writes `test/fixtures/registry/registry.json`.
- `contracts/Election.sol` stores an immutable election Merkle root and enforces `input[3]`.
- On-chain dynamic insertion is not implemented yet.

## ZK Membership Proof

- [x] Extend the voting circuit with Merkle path private inputs.
- [x] Constrain the computed root to equal the public election root.
- [x] Generate fresh proving and verification keys after circuit changes.
- [x] Regenerate `contracts/Verifier.sol` from the final verification key.
- [x] Add fixture-based proof generation tests.

Current foundation:

- `circuits/vote.circom` computes `identityCommitment = Poseidon(secretKey)`.
- Private inputs now include `secretKey`, `pathElements[3]`, and `pathIndices[3]`.
- Public input order is `input[0] = nullifierHash`, `input[1] = candidateId`, `input[2] = electionId`, `input[3] = merkleRoot`.
- The circuit recomputes a depth-3 Merkle root and constrains it to equal public `merkleRoot`.
- On-chain Merkle root storage is implemented as an immutable election root.
- Dynamic on-chain insertion remains out of scope for the MVP.

## Nullifier Double-Voting Prevention

- [x] Keep nullifier hash public in the circuit.
- [x] Bind nullifier derivation to the voter's secret and election identifier.
- [x] Reject reused nullifiers in `Election.castVote`.
- [x] Add tests for first vote success and second vote rejection.

Current foundation:

- `contracts/Election.sol` tracks `usedNullifiers`.
- `circuits/vote.circom` derives `nullifierHash = Poseidon(secretKey, electionId)`.
- Tests submit a valid proof and assert duplicate vote rejection.

## Vote Validity Constraint

- [x] Define valid candidate ID range for each election.
- [x] Constrain `candidateId` in the circuit.
- [x] Mirror candidate validation in Solidity for defense in depth.
- [x] Add tests for valid and invalid candidate IDs.

Current foundation:

- MVP candidate IDs are constrained to 1, 2, 3, or 4.
- Solidity rejects candidate IDs outside 1..4 before verifier execution.

## Solidity Verifier Integration

- [x] Keep generated verifier contract isolated in `contracts/Verifier.sol`.
- [x] Document the exact `snarkjs` command used to generate the verifier.
- [x] Confirm public input ordering matches `Election.castVote`.
- [x] Add integration tests with a known valid proof.

Current foundation:

- `contracts/Election.sol` calls `Groth16Verifier.verifyProof`.
- `ignition/modules/Election.ts` deploys verifier before election.
- Public input order is `input[0] = nullifierHash`, `input[1] = candidateId`, `input[2] = electionId`, `input[3] = merkleRoot`.

## End-to-End Vote Flow

- [ ] Define off-chain flow: register voter, build witness, prove, submit vote.
- [ ] Add script for local proof generation and vote submission.
- [ ] Add frontend wiring for proof generation or proof submission.
- [x] Add an end-to-end test covering deployment, proof, vote, and tally.

Current foundation:

- `frontend/` exists as a Vite application foundation.
- `scripts/proof-generate.mjs` and `scripts/proof-calldata.mjs` generate a local proof and verifier calldata for contract tests.
- A standalone vote-submission script remains pending.

## Gas, Proving, and Constraint Metrics

- [x] Record circuit constraints after each major circuit revision.
- [ ] Record proving time and hardware context.
- [ ] Record verifier deployment gas.
- [ ] Record `castVote` gas for valid votes and failed duplicate attempts.
- [ ] Keep experiment results in `EXPERIMENTS.md`.

Current foundation:

- `circuits/vote.r1cs`, `vote.sym`, `vote_final.zkey`, and `verification_key.json` exist.
- Current circuit metrics are documented in `EXPERIMENTS.md`.
