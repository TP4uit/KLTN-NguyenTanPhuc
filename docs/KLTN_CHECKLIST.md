# KLTN MVP Checklist

This checklist maps the anonymous verifiable voting MVP to the thesis requirements. It tracks the expected deliverables without treating the current repository as complete.

## Merkle Identity Registry

- [x] Define voter identity commitment format.
- [x] Select Merkle tree depth and hash function for the registry.
- [x] Add off-chain registry builder scripts under `scripts/` or `circuits/`.
- [x] Store and publish the election Merkle root on-chain.
- [x] Add tests for root updates, invalid roots, and registry finalization during an election.
- [ ] Add dynamic on-chain registry insertion if it becomes part of thesis scope.

Current foundation:

- MVP identity commitments use `identityCommitment = Poseidon(secretKey)`.
- The off-chain registry helper builds a fixed depth-3 Poseidon tree with 8 leaves.
- `scripts/merkle-registry.mjs` contains reusable tree/proof helpers.
- `scripts/registry-generate.mjs` writes `test/fixtures/registry/registry.json`.
- `contracts/Election.sol` stores an election Merkle root, allows admin updates only during Registration, finalizes it when the election opens, and enforces `input[3]`.
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
- On-chain Merkle root storage is finalized through the election lifecycle before voting opens.
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
- [x] Add script for local proof generation and vote submission.
- [x] Add frontend wiring for proof generation or proof submission.
- [x] Add an end-to-end test covering deployment, proof, vote, and tally.
- [x] Add MVP/demo browser-side proof submission.
- [x] Add local deployment and frontend lifecycle state wiring.
- [ ] Add production identity and secret management.

Current foundation:

- `frontend/` exists as a Vite application foundation.
- `scripts/proof-generate.mjs` and `scripts/proof-calldata.mjs` generate a local proof and verifier calldata for contract tests.
- `scripts/deploy-local.ts` writes local deployment metadata to `deployments/local/election.json`, auto-opens demo deployments by default, and records `electionState`, `electionStateName`, and `autoOpened`.
- `scripts/vote-local.ts` validates deployment/proof calldata consistency, checks the live lifecycle state, recreates ephemeral auto-open deployments when needed, and submits a local fixture vote only while Open.
- `npm run deploy:localhost` and `npm run vote:localhost` target a persistent `npx hardhat node` RPC for MetaMask.
- `frontend/src/contracts/election.local.json` exports local contract metadata and ABI for UI wiring.
- `frontend/src/contracts/vote.calldata.local.json` exports the checked fixture proof calldata for local browser submission.
- The Dashboard primary vote path generates browser proof calldata for the selected candidate and submits it through MetaMask.
- A separate Dashboard fallback still submits the checked fixture proof for candidate 1.
- Dashboard and Results can read the live election lifecycle state from localhost.
- Results can read `Election.getVotes(1..4)` from localhost.
- `frontend/public/zk/vote.wasm` and `frontend/public/zk/vote_final.zkey` provide local browser proving assets.
- `frontend/src/contracts/registry.local.json` exports the selected demo voter secret, precomputed demo nullifier, selected election ID, and Merkle path for local-only browser proof experiments.
- `frontend/src/app/lib/browserProof.ts` scaffolds `snarkjs.groth16.fullProve` and Solidity calldata export in the browser.
- The Dashboard includes a small "Generate proof locally" developer action for proof-only testing.
- MVP/demo browser-side proof submission is complete, but production browser-side proving is not: the current flow uses local/demo-only secret material, relies on the fixture's precomputed demo nullifier, and does not implement production secret management.

## Gas, Proving, and Constraint Metrics

- [x] Record circuit constraints after each major circuit revision.
- [x] Record proving time and hardware context.
- [x] Record verifier deployment gas.
- [x] Record `castVote` gas for valid votes and rejection behavior for failed duplicate attempts.
- [x] Keep experiment results in `EXPERIMENTS.md`.

Current foundation:

- `circuits/vote.r1cs`, `vote.sym`, `vote_final.zkey`, and `verification_key.json` exist.
- Current circuit metrics are documented in `EXPERIMENTS.md`.
- `scripts/audit-registry.mjs`, `scripts/audit-proof.mjs`, and `scripts/audit-calldata.mjs` write machine-readable audit reports under `reports/evidence/`.
- `scripts/benchmark-proof.mjs` records R1CS metrics, artifact sizes, witness generation time, Groth16 proving time, and Solidity calldata export time.
- `scripts/benchmark-gas.ts` records local Hardhat deployment gas, valid `castVote` gas, and rejection behavior for duplicate nullifier, invalid candidate, invalid Merkle root, and invalid proof paths.
- `npm run evidence:all` regenerates the evidence pack and `docs/BENCHMARK_REPORT.md`.
- Latest generated evidence recorded 2502 constraints, 836 ms total proof workflow, 438877 verifier deployment gas, 1016929 election deployment gas, and 298680 gas for valid `castVote`.
- Reverted paths record clear reasons; the local ethers/Hardhat error objects do not expose gas receipts for those failed paths in the current benchmark.
