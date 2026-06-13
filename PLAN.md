# KLTN ZK Voting MVP Plan

## Objective

Build the foundation for an anonymous, verifiable voting MVP using Circom/Groth16 proofs, a Solidity verifier, and a Hardhat test/deployment workflow.

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
   - Add scripts for witness generation, proof creation, calldata export, and vote submission.
   - Add fixture proofs for deterministic tests.
   - Connect frontend to local deployment data.

6. Measure and document
   - Record constraints, proving time, verifier gas, and vote gas.
   - Keep thesis-facing notes in `EXPERIMENTS.md` and `docs/KLTN_CHECKLIST.md`.

## Near-Term Backlog

- [ ] Fix or confirm the Hardhat 3 test pattern in `test/Election.test.ts`.
- [ ] Add a minimal valid proof fixture for the current circuit.
- [ ] Decide whether the identity registry is contract-managed or generated off-chain with root publication.
- [ ] Add `.gitignore` coverage for generated proving artifacts if they should not be versioned.
- [ ] Document exact Circom and snarkjs versions used for reproducibility.
