# Benchmark and Audit Report

Generated: 2026-06-14T05:29:26.286Z

This report summarizes reproducible evidence for the current KLTN ZK voting MVP. Machine-readable reports live under `reports/evidence/`.

## Public Input Order

```text
input[0] = nullifierHash
input[1] = candidateId
input[2] = electionId
input[3] = merkleRoot
```

## Circuit Metrics

| Metric | Value |
| --- | --- |
| Curve | bn-128 |
| Wires | 2508 |
| Constraints | 2502 |
| Private inputs | 7 |
| Public inputs | 4 |
| Labels | 3680 |
| Outputs | 0 |

## Artifact Sizes

| Artifact | Size |
| --- | --- |
| r1cs | 331,684 bytes |
| wasm | 1,972,906 bytes |
| zkey | 1,171,812 bytes |
| verificationKey | 3,477 bytes |
| verifierSolidity | 8,224 bytes |
| proofJson | 855 bytes |
| publicSignalsJson | 181 bytes |
| calldataJson | 1,538 bytes |

## Proof Generation Benchmark

| Step | Time |
| --- | --- |
| Witness generation | 96 ms |
| Groth16 proving | 740 ms |
| Solidity calldata export | 0 ms |
| Total proof workflow | 836 ms |
| Benchmark command total | 3606 ms |

## Gas Benchmark

| Operation | Gas / Result |
| --- | --- |
| Groth16Verifier deployment | 438877 |
| Election deployment | 1016929 |
| Valid castVote | 298680 |
| Duplicate nullifier | reverted (Loi: Cu tri nay da bo phieu!) |
| Invalid candidate | reverted (Invalid candidate) |
| Invalid Merkle root | reverted (Invalid Merkle root) |
| Invalid proof | reverted (Loi: ZK Proof khong hop le) |

## Audit Results

| Audit | Result |
| --- | --- |
| Registry recomputation | PASS |
| Proof verification | PASS |
| Calldata consistency | PASS |

## Environment Notes

- Node: v24.14.1
- Platform: win32
- Architecture: x64
- Hardhat gas benchmark network: default

## Known Limitations

- Browser proof submission is MVP/demo only. The frontend uses local demo registry material and a precomputed local demo nullifier.
- Production identity storage, voter registration, and key management are not implemented.
- Dynamic on-chain Merkle insertion is not implemented; the MVP uses an immutable Merkle root.
- Gas measurements are from a local Hardhat development network and are intended for thesis comparison, not production cost prediction.
- Reverted transaction paths record revert reasons. The local ethers/Hardhat error objects may not expose gas receipts for failed estimates.
- Groth16 proof bytes are randomized across proof generation runs while public signals remain stable for the same inputs.
