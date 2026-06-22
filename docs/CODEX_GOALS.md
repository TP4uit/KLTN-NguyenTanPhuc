# Codex Goals

## Goal 1 - Account & Role Foundation

- [x] Add frontend demo auth data model and localStorage auth service.
- [x] Add React AuthProvider and useAuth hook.
- [x] Add login and register pages.
- [x] Add authenticated and role-based route guards.
- [x] Add authenticated header state, account page, and wallet linking.

## Final Verification Notes

- Frontend auth is local demo state only.
- Account identity remains separate from vote proof, nullifier, secret key, and candidate choice.
- Wallet linking stores only the selected MetaMask address on the current demo user.
- `cd frontend && npm run build` passed.
- Headless Chrome smoke test passed for guest `/dashboard`, voter `/admin`, admin `/admin`, and auditor `/account`.

## Goal 2 - Voter Registration and ZK Identity Onboarding

- [x] Add frontend voter registration domain model and localStorage service.
- [x] Add voter registration hook and voter-facing onboarding panel.
- [x] Add admin voter registration management UI.
- [x] Gate voting UI by approved registration.
- [x] Add registration evidence summary and approved commitments export.
- [x] Connect approved registration state to ZK identity onboarding.

Verification notes:

- Registration onboarding remains frontend-local demo state; approved status now gates Dashboard vote submission controls without changing contracts, proofs, or voting logic.
- Demo identity commitments are browser-derived onboarding values and do not replace the current circuit/registry fixture.
- Headless Chrome smoke test passed for voter login, dashboard onboarding, PENDING registration creation, and PENDING persistence after refresh.
- Admin voter management is local demo review state only; it does not update Merkle roots, contracts, proofs, or vote submission behavior.
- Headless Chrome smoke test passed for admin registration review: pending registration visibility, approve to APPROVED, and reject to REJECTED with a required reason.
- Dashboard vote submission controls are enabled only for APPROVED local voter registrations while the election is Open.
- Headless Chrome smoke test covered NOT_REGISTERED, PENDING, APPROVED, and REJECTED dashboard gates. In the current local `Registration` election state, candidate vote buttons and the fixture fallback stay disabled even for an approved voter.
- Registration evidence export includes election counts and approved identity commitments only; it excludes identity secrets, passwords, vote choices, candidate choices, proofs, nullifiers, and transaction hashes.
- Headless Chrome smoke test passed for voter registration creation, admin approval, Registration Evidence display, copy JSON, download JSON, forbidden-field exclusion, and the approved voter account evidence card.
- Headless Chrome smoke test passed for the Registration Evidence empty state when no approved commitments exist.
- Approved registration proof readiness is fixture compatibility only: the seeded demo voter uses the static local registry fixture, while new demo accounts remain onboarding-only until a future dynamic Merkle registry goal.
- Headless Chrome smoke test passed for seeded demo voter fixture compatibility and a newly registered voter approved-but-incompatible flow; current local `Registration` election state keeps vote controls disabled until Open.

## Goal 3 - Registry and Merkle Root Workflow

- [x] Add dynamic registry preview from approved commitments.
- [x] Add Merkle root safety and alignment panel.
- [x] Add safe admin Merkle root set flow.
- [x] Add safe admin Open Election flow.

Verification notes:

- Registry Preview is admin review state only. It does not update contracts, proof artifacts, browser proof generation, deployment scripts, or `Election.castVote`.
- The preview root is generated from approved local identity commitments with deterministic SHA-256-derived demo hashes, not the Poseidon registry used by the ZK circuit.
- Registry preview JSON includes election metadata, preview tree levels, approved leaves, and warnings only; it excludes identity secrets, passwords, vote choices, candidate choices, proofs, nullifiers, and transaction hashes.
- Headless Chrome smoke test passed for approved voter registration, Registry Preview display, merkleRootPreview generation, copy JSON, download JSON, safe JSON shape, forbidden-field exclusion, and empty preview state.
- Headless Chrome smoke test passed for Registry Preview overflow warning when approved commitments exceed capacity.
- Merkle Root Alignment compares contract/admin state, static proof fixture, registry preview, and metadata roots. It recommends the static proof fixture root and only fills the New Merkle root input when requested; it does not submit `setMerkleRoot`.
- Headless Chrome smoke test passed for Merkle Root Alignment display, fixture/preview/alignment JSON copy actions, fixture-root input fill, and no automatic transaction submission.
- Admin `setMerkleRoot` now requires an in-page confirmation showing the selected root, root classification, election state, and Registration-only warning before submitting the unchanged contract call.
- Headless Chrome smoke tests passed for fixture/preview/Clear source buttons, live root classification, no-wallet disabled submit state, confirmation cancel with zero transactions, and mocked-admin confirmation submit sending one `setMerkleRoot` call with the fixture root.
- Admin `openElection` now shows Open Election Readiness before lifecycle buttons and requires in-page confirmation before submitting the unchanged `openElection` contract call.
- Open Election Readiness blocks non-Registration or zero-root states, marks the static proof fixture root as browser proof-compatible, and warns for preview/custom roots because preview roots are not proof-compatible until matching Poseidon proof inputs are generated.
- Headless Chrome smoke test passed for readiness display, fixture success, preview/custom warnings, `openElection` cancel with zero transactions, confirmed `openElection` selector, and `closeElection` from Open state.

## Goal 4 - Results and Audit UX

- [x] Make Results page honest about on-chain tally state.
- [x] Add Results audit export.
- [x] Add auditor-facing audit verification workspace.

Verification notes:

- Results candidate metadata is shared with Dashboard, while vote counts now load only from contract `getVotes(candidateId)` reads.
- Before a successful contract read, `/results` shows candidate metadata with "Not loaded" or "Not connected" states instead of fake live totals, turnout, trend, or block values.
- Local approved voter count is labeled as local demo registration metadata; turnout is only shown as local demo turnout when both on-chain votes and local approved voters are available.
- Preview/mock tallies are not used as fallback on read failure; connection and contract errors remain visible.
- Headless Chrome smoke test passed for disconnected `/results`, zero on-chain tallies, `getVotes` calls for candidates 1-4, and refreshed mocked on-chain tally/block updates. A real localhost chain was not running for an end-to-end `castVote` smoke.
- Results Audit Export emits public tally data, local demo approved-voter counts, source/block/lifecycle metadata, candidate sum checks, and warnings only; it excludes voter identities, secrets, passwords, vote choices, proofs, nullifiers, private wallet data, and transaction hashes.
- Headless Chrome smoke test passed for disabled disconnected export state, mocked on-chain audit summary, copy JSON, download JSON, safe filename, forbidden-field exclusion, and candidate sum equaling `totalVotes`.
- `/audit` is available to ADMIN and AUDITOR demo accounts only. It validates imported Results audit JSON, rejects forbidden private-field keys, shows candidate tallies and check status, and can compare against current localhost contract reads without contract writes.
- Headless Chrome smoke test passed for auditor `/audit` access, voter denial, admin `/audit` access, valid audit JSON validation, malformed JSON parse errors, forbidden private-field rejection, and mocked live comparison.
- Headless Chrome smoke test passed for copying a mocked on-chain Results audit export from `/results` and validating that exact JSON in `/audit`.
