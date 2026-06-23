# Final Verification Checklist

Use this checklist before recording the final thesis demo or packaging the repository for review. Run commands from the repository root unless a `cd frontend` prefix is shown.

## Automated Commands

- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run typecheck`
- [ ] `cd frontend && npm run build`
- [ ] `cd frontend && npm run smoke:registry-preview`
- [ ] `cd frontend && npm run smoke:results-audit`
- [ ] `cd frontend && npm run smoke:evidence-package`

Optional generated evidence refresh:

- [ ] `npm run evidence:all`

Do not manually edit generated benchmark numbers after running evidence commands. If benchmark evidence is refreshed, review `docs/BENCHMARK_REPORT.md` and `reports/evidence/`.

## Manual Browser Checks

### Static Fixture Mode End-to-End

- [ ] Start `npm run node:local`.
- [ ] Generate fixtures and deploy with `LOCAL_ELECTION_AUTO_OPEN=false`.
- [ ] Open frontend with `cd frontend && npm run dev`.
- [ ] Sign in as admin.
- [ ] Open `/admin`, connect MetaMask, choose Static Fixture Mode, confirm `setMerkleRoot`, and confirm `openElection`.
- [ ] Sign in as fixture-compatible voter.
- [ ] Open `/dashboard` and confirm static/fixture submit readiness.
- [ ] Cast one static/fixture-compatible vote.
- [ ] Open `/results`, refresh tallies, and confirm `demoMode` is `STATIC_FIXTURE`.
- [ ] Export Results audit JSON and/or public evidence package.
- [ ] Open `/audit`, import the export, and validate.

### Dynamic Poseidon Mode End-to-End

- [ ] Sign in as voter and create a local Poseidon registration if needed.
- [ ] Sign in as admin.
- [ ] Open `/admin`, approve the registration, and confirm Registry Preview includes compatible Poseidon leaves.
- [ ] Choose Dynamic Poseidon Mode, confirm `setMerkleRoot`, and confirm `openElection`.
- [ ] Sign in as the approved Poseidon voter.
- [ ] Open `/dashboard` and confirm Dynamic Vote Readiness passes.
- [ ] Cast one guarded Dynamic submit vote.
- [ ] Open `/results`, refresh tallies, and confirm `demoMode` is `DYNAMIC_POSEIDON`.
- [ ] Export public evidence package.
- [ ] Open `/audit`, import the package, and validate the Evidence Package Review.

### Results, Audit, and Evidence Package Import

- [ ] `/results` shows on-chain tally, Merkle root, demo mode, and root match flags.
- [ ] Results audit JSON copies/downloads successfully.
- [ ] Public evidence package copies/downloads successfully.
- [ ] `/audit` accepts raw Results audit JSON.
- [ ] `/audit` accepts full public evidence package.
- [ ] Evidence Package Review separates on-chain Results audit, registration evidence, registry preview, root alignment, warnings, and verdict.
- [ ] Live comparison works from raw audit import.
- [ ] Live comparison works from evidence package import.
- [ ] Normalized review report copies/downloads and contains no private field names.

## Limitation Checklist

- [ ] Documentation and demo narration clearly say the system is local demo/MVP only.
- [ ] Documentation and demo narration clearly say production identity management is not implemented.
- [ ] Documentation and demo narration clearly say dynamic on-chain Merkle insertion is not implemented.
- [ ] Documentation and demo narration clearly say public evidence packages are not cryptographic proof of per-vote provenance.
- [ ] Screenshots do not expose identity secrets, passwords, raw proofs, raw nullifiers, vote choices after submission, transaction hashes, wallet addresses, private keys, or private wallet data.
- [ ] Public `identityCommitment` values are described only as public registry commitments.

