# KLTN MVP Checklist

This checklist maps the anonymous verifiable voting MVP to the thesis requirements. It tracks the expected deliverables without treating the current repository as complete.

## Merkle Identity Registry

- [ ] Define voter identity commitment format.
- [ ] Select Merkle tree depth and hash function for the registry.
- [ ] Add off-chain registry builder scripts under `scripts/` or `circuits/`.
- [ ] Store and publish the election Merkle root on-chain.
- [ ] Add tests for root updates, invalid roots, and registry immutability during an election.

Current foundation:

- `circuits/` exists and already uses Poseidon from `circomlib`.
- `contracts/Election.sol` does not yet store a Merkle root.

## ZK Membership Proof

- [ ] Extend the voting circuit with Merkle path private inputs.
- [ ] Constrain the computed root to equal the public election root.
- [ ] Generate fresh proving and verification keys after circuit changes.
- [ ] Regenerate `contracts/Verifier.sol` from the final verification key.
- [ ] Add fixture-based proof generation tests.

Current foundation:

- `circuits/vote.circom` proves a secret key hashes to a public nullifier.
- Full membership inclusion is still a planned milestone.

## Nullifier Double-Voting Prevention

- [ ] Keep nullifier hash public in the circuit.
- [ ] Bind nullifier derivation to the voter's secret and election identifier.
- [ ] Reject reused nullifiers in `Election.castVote`.
- [ ] Add tests for first vote success and second vote rejection.

Current foundation:

- `contracts/Election.sol` already tracks `usedNullifiers`.
- Existing tests do not yet submit a valid proof or assert duplicate vote rejection.

## Vote Validity Constraint

- [ ] Define valid candidate ID range for each election.
- [ ] Constrain `candidateId` in the circuit.
- [ ] Mirror candidate validation in Solidity for defense in depth.
- [ ] Add tests for valid and invalid candidate IDs.

Current foundation:

- `candidateId` is a public circuit input.
- Solidity currently counts any `candidateId`.

## Solidity Verifier Integration

- [ ] Keep generated verifier contract isolated in `contracts/Verifier.sol`.
- [ ] Document the exact `snarkjs` command used to generate the verifier.
- [ ] Confirm public input ordering matches `Election.castVote`.
- [ ] Add integration tests with a known valid proof.

Current foundation:

- `contracts/Election.sol` calls `Groth16Verifier.verifyProof`.
- `ignition/modules/Election.ts` deploys verifier before election.

## End-to-End Vote Flow

- [ ] Define off-chain flow: register voter, build witness, prove, submit vote.
- [ ] Add script for local proof generation and vote submission.
- [ ] Add frontend wiring for proof generation or proof submission.
- [ ] Add an end-to-end test covering deployment, proof, vote, and tally.

Current foundation:

- `frontend/` exists as a Vite application foundation.
- `scripts/send-op-tx.ts` is a Hardhat example and not yet voting-specific.

## Gas, Proving, and Constraint Metrics

- [ ] Record circuit constraints after each major circuit revision.
- [ ] Record proving time and hardware context.
- [ ] Record verifier deployment gas.
- [ ] Record `castVote` gas for valid votes and failed duplicate attempts.
- [ ] Keep experiment results in `EXPERIMENTS.md`.

Current foundation:

- `circuits/vote.r1cs`, `vote.sym`, `vote_final.zkey`, and `verification_key.json` exist.
- Baseline metrics still need to be collected and documented.
