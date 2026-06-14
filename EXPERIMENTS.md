# Experiments Log

Use this file to record reproducible measurements and decisions for the KLTN voting MVP.

## Template

### YYYY-MM-DD - Experiment Name

- Goal:
- Inputs:
- Commands:
- Environment:
- Result:
- Notes:

## Planned Experiments

### 2026-06-14 - Local Deployment and Vote Submission

- Goal: Verify the local end-to-end deployment and vote submission workflow against the current Merkle membership circuit and Solidity verifier.
- Inputs:
  - `electionId`: `1`
  - `merkleRoot`: `7932749078796165988725230467181390602760147441196774940239533986225546804780`
  - `candidateId`: `1`
  - `nullifierHash`: `9949772996283065961028046280886251458800049835521251014398656492972427599980`
  - Public input order: `input[0] = nullifierHash`, `input[1] = candidateId`, `input[2] = electionId`, `input[3] = merkleRoot`
- Commands:
  - `npm run registry:generate`
  - `npm run proof:generate`
  - `npm run proof:calldata`
  - `npm run build`
  - `npm test`
  - `npm run typecheck`
  - `npm run deploy:local`
  - `npm run vote:local`
- Environment:
  - Windows PowerShell
  - Hardhat local in-process network, chain ID `31337`
- Deployment result:
  - Verifier: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
  - Election: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
  - Metadata: `deployments/local/election.json`
  - Frontend metadata: `frontend/src/contracts/election.local.json`
- Vote result:
  - Transaction hash: `0xcdd5b314ca282007d67a4d41793d0f2703d77fada9317a15da3cd87d45aef082`
  - Gas used: `298680`
  - Updated candidate 1 votes: `1`
- Notes:
  - `npm run build` and other Hardhat commands may require AppData access in the managed sandbox because Hardhat creates its user config directory.
  - Hardhat local state is ephemeral between separate `hardhat run` commands, so `vote-local.ts` recreates the deterministic local deployment if needed before submitting the vote.

### 2026-06-14 - On-Chain Merkle Root Enforcement

- Goal: Store the off-chain registry root immutably in `Election.sol` and reject proofs whose public `merkleRoot` does not match the election root.
- Inputs:
  - `electionId`: `1`
  - `merkleRoot`: `7932749078796165988725230467181390602760147441196774940239533986225546804780`
  - Public input order: `input[0] = nullifierHash`, `input[1] = candidateId`, `input[2] = electionId`, `input[3] = merkleRoot`
- Commands:
  - `npm run registry:generate`
  - `npm run proof:generate`
  - `npm run proof:calldata`
  - `npm run build`
  - `npm test`
  - `npm run typecheck`
- Test result:
  - `npm run build`: passed.
  - `npm test`: 15 passing Mocha tests.
  - `npm run typecheck`: passed.
  - Covered deployment root storage, valid registered voter proof, wrong-root rejection with `Invalid Merkle root`, wrong election rejection, candidate bounds, replay rejection, and existing registry helper checks.
- Notes:
  - Circuit, zkey, and verifier were not regenerated for this pass.
  - Dynamic on-chain Merkle insertion remains pending.

### 2026-06-14 - Circuit Merkle Membership Integration

- Goal: Integrate the fixed depth-3 off-chain registry fixture into the voting circuit and proof workflow.
- Inputs:
  - `secretKey`: `123456789`
  - `candidateId`: `1`
  - `electionId`: `1`
  - `nullifierHash`: `9949772996283065961028046280886251458800049835521251014398656492972427599980`
  - `merkleRoot`: `7932749078796165988725230467181390602760147441196774940239533986225546804780`
  - `pathElements[3]`: from `test/fixtures/registry/registry.json`
  - `pathIndices[3]`: from `test/fixtures/registry/registry.json`
  - Public input order: `input[0] = nullifierHash`, `input[1] = candidateId`, `input[2] = electionId`, `input[3] = merkleRoot`
- Artifact regeneration commands:
  - `npm run registry:generate`
  - `.\circom.exe circuits/vote.circom --r1cs --wasm --sym -o circuits`
  - `npx snarkjs groth16 setup circuits/vote.r1cs pot12_final.ptau vote_0000.zkey`
  - `npx snarkjs zkey contribute vote_0000.zkey vote_final.zkey --name="KLTN MVP Merkle membership" -e="kltn-merkle-membership-2026-06-14"`
  - `npx snarkjs zkey export verificationkey vote_final.zkey verification_key.json`
  - `npx snarkjs zkey verify circuits/vote.r1cs pot12_final.ptau vote_final.zkey`
  - `npx snarkjs zkey export solidityverifier vote_final.zkey contracts/Verifier.sol`
- Verification commands:
  - `npm run registry:generate`
  - `npm run proof:generate`
  - `npm run proof:calldata`
  - `npx snarkjs r1cs info circuits/vote.r1cs`
  - `npm run build`
  - `npm test`
  - `npm run typecheck`
- R1CS metrics:
  - Curve: `bn-128`
  - Wires: `2508`
  - Constraints: `2502`
  - Private inputs: `7`
  - Public inputs: `4`
  - Labels: `3680`
  - Outputs: `0`
- Artifact sizes:
  - `circuits/vote.r1cs`: 331684 bytes
  - `circuits/vote.sym`: 183887 bytes
  - `circuits/vote_js/vote.wasm`: 1972906 bytes
  - `vote_0000.zkey`: 1171392 bytes
  - `vote_final.zkey`: 1171812 bytes
  - `verification_key.json`: 3477 bytes
  - `contracts/Verifier.sol`: 8224 bytes
  - `test/fixtures/vote/input.json`: 591 bytes
  - `test/fixtures/vote/proof.json`: 859 bytes
  - `test/fixtures/vote/public.json`: 181 bytes
  - `test/fixtures/vote/calldata.json`: 1538 bytes
  - `test/fixtures/vote/calldata.txt`: 844 bytes
  - `test/fixtures/vote/witness.wtns`: 80332 bytes, regenerated and ignored by git
  - `test/fixtures/registry/registry.json`: 1585 bytes
- Test result:
  - `npm run build`: passed.
  - `npm test`: 15 passing Mocha tests.
  - `npm run typecheck`: passed.
  - Covered valid registered voter proof, replay rejection, wrong election rejection, tampered Merkle root verifier rejection, tampered path element/index proof-generation failure, candidate validity, and registry helper root recomputation.
- Notes:
  - On-chain Merkle root storage was pending at this stage and is covered by the later root enforcement entry.
  - Groth16 proof bytes remain randomized across regeneration runs.

### 2026-06-14 - Election-Specific Nullifier and Candidate Validity

- Goal: Bind vote nullifiers to an election ID and constrain MVP candidate IDs to 1, 2, 3, or 4 in the circuit and Solidity.
- Inputs:
  - `secretKey`: `123456789`
  - `candidateId`: `1`
  - `electionId`: `1`
  - `nullifierHash`: `9949772996283065961028046280886251458800049835521251014398656492972427599980`
  - Public input order: `input[0] = nullifierHash`, `input[1] = candidateId`, `input[2] = electionId`
- Artifact regeneration commands:
  - `.\circom.exe circuits/vote.circom --r1cs --wasm --sym -o circuits`
  - `npx snarkjs groth16 setup circuits/vote.r1cs pot12_final.ptau vote_0000.zkey`
  - `npx snarkjs zkey contribute vote_0000.zkey vote_final.zkey --name="KLTN MVP candidate validity" -e="kltn-election-candidate-validity-2026-06-14"`
  - `npx snarkjs zkey export verificationkey vote_final.zkey verification_key.json`
  - `npx snarkjs zkey verify circuits/vote.r1cs pot12_final.ptau vote_final.zkey`
  - `npx snarkjs zkey export solidityverifier vote_final.zkey contracts/Verifier.sol`
- Verification commands:
  - `npm run proof:generate`
  - `npm run proof:calldata`
  - `npx snarkjs r1cs info circuits/vote.r1cs`
  - `npm run build`
  - `npm test`
  - `npm run typecheck`
- R1CS metrics:
  - Curve: `bn-128`
  - Wires: `527`
  - Constraints: `524`
  - Private inputs: `1`
  - Public inputs: `3`
  - Labels: `779`
  - Outputs: `0`
- Artifact sizes:
  - `circuits/vote.r1cs`: 69980 bytes
  - `circuits/vote_js/vote.wasm`: 1747978 bytes
  - `vote_0000.zkey`: 256868 bytes
  - `vote_final.zkey`: 257289 bytes
  - `verification_key.json`: 3294 bytes
  - `contracts/Verifier.sol`: 7837 bytes
  - `test/fixtures/vote/input.json`: 173 bytes
  - `test/fixtures/vote/proof.json`: 854 bytes
  - `test/fixtures/vote/public.json`: 99 bytes
  - `test/fixtures/vote/calldata.json`: 1294 bytes
  - `test/fixtures/vote/calldata.txt`: 775 bytes
  - `test/fixtures/vote/witness.wtns`: 16940 bytes, regenerated and ignored by git
- Test result:
  - `npm run build`: passed.
  - `npm test`: 8 passing Mocha tests.
  - `npm run typecheck`: passed.
  - Covered valid proof vote, tally increment, event arguments, replay rejection, wrong election ID rejection, Solidity rejection for candidates 0 and 5, verifier rejection for mismatched bounded candidate input, and circuit witness failure for candidates 0 and 5.
- Notes:
  - Merkle membership was pending at this stage and is covered by the later circuit membership entry.
  - Groth16 proof bytes remain randomized across regeneration runs, while public signals and input order are deterministic for the sample input.

### 2026-06-14 - Simplified Vote Proof Vertical Slice

- Goal: Generate a valid proof for the current `circuits/vote.circom`, export Solidity calldata, and verify it through `Election.castVote`.
- Inputs:
  - `secretKey`: `123456789`
  - `candidateId`: `1`
  - `nullifierHash`: `7110303097080024260800444665787206606103183587082596139871399733998958991511`
  - Public input order: `input[0] = nullifierHash`, `input[1] = candidateId`
- Commands:
  - `npm run proof:generate`
  - `npm run proof:calldata`
  - `npx snarkjs r1cs info circuits/vote.r1cs`
  - `npm run build`
  - `npm test`
  - `npm run typecheck`
- Environment:
  - Windows PowerShell
  - Node/npm local project dependencies
  - `snarkjs` `0.7.6`
  - `circomlibjs` `0.1.7`
- R1CS metrics:
  - Curve: `bn-128`
  - Wires: `418`
  - Constraints: `415`
  - Private inputs: `1`
  - Public inputs: `2`
  - Labels: `584`
  - Outputs: `0`
- Proof fixture artifact sizes:
  - `test/fixtures/vote/input.json`: 152 bytes
  - `test/fixtures/vote/proof.json`: 857 bytes
  - `test/fixtures/vote/public.json`: 92 bytes
  - `test/fixtures/vote/calldata.json`: 1125 bytes
  - `test/fixtures/vote/calldata.txt`: 706 bytes
  - `test/fixtures/vote/witness.wtns`: 13452 bytes, regenerated and ignored by git
- Test result:
  - `npm run build`: passed with `No contracts to compile`.
  - `npm test`: 5 passing Mocha tests.
  - `npm run typecheck`: passed.
  - Covered valid proof vote, tally increment, `VoteCast` event arguments, replay rejection, and mismatched public input rejection.
- Notes:
  - Groth16 proof bytes are randomized across proof generation runs, but the sample input and public signals stay stable.
  - Tests consume the generated calldata fixture; `npm run proof:generate` regenerates an equivalent valid proof and calldata.

### Baseline Circuit Metrics

- Goal: Record constraint count and artifact sizes for the current `circuits/vote.circom`.
- Commands:
  - `npx snarkjs r1cs info circuits/vote.r1cs`
  - `Get-Item circuits/vote_js/vote.wasm, vote_final.zkey, verification_key.json`
- Result: Captured in `2026-06-14 - Simplified Vote Proof Vertical Slice`.

### Verifier Deployment Gas

- Goal: Measure gas for deploying `Groth16Verifier` and `Election`.
- Commands:
  - `npm run deploy:local`
- Result: Pending deployment gas-specific measurement. Local addresses and metadata are now recorded in the local deployment experiment.

### Vote Transaction Gas

- Goal: Measure `castVote` gas for a valid proof and duplicate nullifier rejection.
- Commands:
  - `npm run vote:local`
- Result: Valid fixture vote used `298680` gas. Duplicate nullifier rejection gas remains pending.

### Proving Time

- Goal: Measure witness generation and Groth16 proving time on the development machine.
- Commands:
  - `npm run proof:generate`
- Result: Initial observed run completed in about 5 seconds after adding explicit script process exit.
