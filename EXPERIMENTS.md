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
  - `npx hardhat ignition deploy ignition/modules/Election.ts --network hardhatMainnet`
- Result: Pending.

### Vote Transaction Gas

- Goal: Measure `castVote` gas for a valid proof and duplicate nullifier rejection.
- Commands:
  - Pending gas-specific test or report.
- Result: Pending gas measurement.

### Proving Time

- Goal: Measure witness generation and Groth16 proving time on the development machine.
- Commands:
  - `npm run proof:generate`
- Result: Initial observed run completed in about 5 seconds after adding explicit script process exit.
