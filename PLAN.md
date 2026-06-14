# KLTN ZK Voting MVP Plan

## Objective

Build the foundation for an anonymous, verifiable voting MVP using Circom/Groth16 proofs, a Solidity verifier, and a Hardhat test/deployment workflow. The current near-term target is a reproducible local flow from registry fixture to proof calldata, deployment, vote submission, and tally observation.

## Repository Structure

- `contracts/`: Solidity election contract and generated verifier.
- `circuits/`: Circom voting circuit, witness artifacts, and generated circuit outputs.
- `scripts/`: Hardhat scripts for local workflows and future proof/vote automation.
- `test/`: TypeScript integration tests for contract and proof flows.
- `ignition/`: Hardhat Ignition deployment modules.
- `frontend/`: Vite frontend foundation for voter and results UI.
- `docs/`: Thesis checklists and design documentation.

## MVP Milestones

1. Stabilize project foundation
   - Replace starter documentation.
   - Ensure `npm test` runs Hardhat tests.
   - Track known blockers and experiment results.

2. Formalize circuit interface
   - Define public inputs: Merkle root, nullifier hash, candidate ID, election ID if needed.
   - Define private inputs: identity secret and Merkle authentication path.
   - Add vote validity constraints.

3. Implement identity registry
   - Build or import a Merkle tree utility.
   - Persist roots for local tests.
   - Add Solidity root management.

4. Integrate verifier and election contract
   - Regenerate verifier from the final circuit.
   - Align public input ordering across circuit, verifier, and `Election.castVote`.
   - Add duplicate nullifier and invalid proof tests.

5. Prove and submit votes end to end
   - Maintain scripts for witness generation, proof creation, calldata export, local deployment, and vote submission.
   - Add fixture proofs for deterministic tests.
   - Export local deployment metadata for frontend integration.

6. Measure and document
   - Record constraints, proving time, verifier gas, and vote gas.
   - Keep thesis-facing notes in `EXPERIMENTS.md` and `docs/KLTN_CHECKLIST.md`.

## Near-Term Backlog

- [x] Confirm the Hardhat 3 test pattern in `test/Election.test.ts`.
- [x] Add a valid proof fixture for the current Merkle membership circuit.
- [x] Use an off-chain registry fixture with immutable on-chain root publication for the MVP.
- [x] Add local deployment and vote submission scripts.
- [x] Export local contract metadata for future frontend wiring.
- [ ] Add frontend vote submission and results UI wiring.
- [ ] Record duplicate-nullifier failure gas and hardware context for proving measurements.
- [ ] Document exact Circom binary provenance for reproducibility.
