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

Verification notes:

- Registry Preview is admin review state only. It does not update contracts, proof artifacts, browser proof generation, deployment scripts, or `Election.castVote`.
- The preview root is generated from approved local identity commitments with deterministic SHA-256-derived demo hashes, not the Poseidon registry used by the ZK circuit.
- Registry preview JSON includes election metadata, preview tree levels, approved leaves, and warnings only; it excludes identity secrets, passwords, vote choices, candidate choices, proofs, nullifiers, and transaction hashes.
- Headless Chrome smoke test passed for approved voter registration, Registry Preview display, merkleRootPreview generation, copy JSON, download JSON, safe JSON shape, forbidden-field exclusion, and empty preview state.
- Headless Chrome smoke test passed for Registry Preview overflow warning when approved commitments exceed capacity.
- Merkle Root Alignment compares contract/admin state, static proof fixture, registry preview, and metadata roots. It recommends the static proof fixture root and only fills the New Merkle root input when requested; it does not submit `setMerkleRoot`.
- Headless Chrome smoke test passed for Merkle Root Alignment display, fixture/preview/alignment JSON copy actions, fixture-root input fill, and no automatic transaction submission.
