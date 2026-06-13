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

### Baseline Circuit Metrics

- Goal: Record constraint count and artifact sizes for the current `circuits/vote.circom`.
- Commands:
  - `npx snarkjs r1cs info circuits/vote.r1cs`
  - `Get-Item circuits/vote_js/vote.wasm, vote_final.zkey, verification_key.json`
- Result: Pending.

### Verifier Deployment Gas

- Goal: Measure gas for deploying `Groth16Verifier` and `Election`.
- Commands:
  - `npx hardhat ignition deploy ignition/modules/Election.ts --network hardhatMainnet`
- Result: Pending.

### Vote Transaction Gas

- Goal: Measure `castVote` gas for a valid proof and duplicate nullifier rejection.
- Commands:
  - Pending valid proof fixture.
- Result: Blocked until valid proof fixture exists.

### Proving Time

- Goal: Measure witness generation and Groth16 proving time on the development machine.
- Commands:
  - Pending proof generation script.
- Result: Blocked until proof generation script is checked in.
