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
