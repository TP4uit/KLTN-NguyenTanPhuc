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
- Registry Preview is now superseded by the Goal 5 Poseidon preview path; it remains preview-only and does not update contracts or proof inputs.
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

## Goal 5 - Dynamic Poseidon Registry and Proof Inputs

- [x] Add browser Poseidon identity commitment derivation.
- [x] Convert registry preview to Poseidon tree over approved commitments.
- [x] Harden browser runtime verification for Poseidon registry preview.
- [x] Add dynamic Poseidon Merkle path/proof input artifact preview.
- [x] Add dynamic browser proof dev check.
- [x] Add dynamic vote submission readiness gate.
- [x] Add guarded dynamic vote submit flow.
- [x] Add admin demo mode switch and root mode guide.

Verification notes:

- New non-fixture demo voter registrations derive identity commitments with browser Poseidon over the local demo secret and are marked `POSEIDON`.
- The seeded demo voter continues to use the static registry fixture secret and commitment, marked `FIXTURE_POSEIDON`, and remains the only proof fixture-compatible onboarding path.
- Existing registrations without `commitmentScheme` load safely as `SHA256_DEMO`, unless their commitment matches the static fixture commitment.
- Registration evidence includes `commitmentScheme` and still excludes secrets, passwords, vote choices, proofs, nullifiers, and transaction hashes.
- Admin Registry Preview now builds depth-3, capacity-8 Poseidon levels from approved `POSEIDON` and `FIXTURE_POSEIDON` `identityCommitment` leaves, sorted by commitment then registration ID.
- Approved `SHA256_DEMO` registrations are excluded from Poseidon preview leaves and reported as incompatible with a reason.
- Preview JSON includes hash function, leaf formula, compatible/incompatible counts, compatible leaves, incompatible leaves, levels, and warnings only; it excludes secrets, passwords, vote choices, proofs, nullifiers, and transaction hashes.
- Merkle Root Alignment distinguishes the static fixture root from the dynamic Poseidon preview root; each supports a different local demo submit mode and must be selected intentionally.
- Admin Registry Preview includes a browser runtime diagnostic action that rebuilds the Poseidon preview, checks tree levels, root shape, scheme filtering, `SHA256_DEMO` incompatibility reporting, and private-field redaction.
- Admin Dynamic Proof Input Preview now derives inspectable depth-3 Poseidon Merkle paths from approved `POSEIDON` and `FIXTURE_POSEIDON` registry preview leaves, including `leafIndex`, `pathElements`, `pathIndices`, `merkleRootPreview`, `candidateId`, and `nullifierHashPreview` only when local identity material is available.
- Dynamic artifact readiness blocks `SHA256_DEMO` registrations, overflow-excluded compatible registrations, and full input previews without local identity material while still allowing Merkle path preview when possible.
- Dynamic artifact JSON excludes raw identity material, passwords, vote choices, generated proofs, transaction hashes, and wallet private data; it intentionally includes only `nullifierHashPreview` when derivable for preview inspection.
- Dashboard has separate static fixture voting and guarded dynamic Poseidon voting paths. Static fixture voting remains available and unchanged.
- Admin Dynamic Proof Input Preview can run a dev-only dynamic browser proof check from prepared Poseidon path artifacts, returning public signals and calldata inputs without exposing raw identity material or submitting a transaction.
- Dynamic browser proof generation can now feed the explicit `Dynamic submit` action on candidate cards. It remains guarded by readiness, Open election state, current UI-session vote state, and `contract.merkleRoot == dynamicPreviewRoot`.
- Dashboard Dynamic Vote Readiness reports whether dynamic Poseidon submit is available by checking approved Poseidon registration state, preview leaf inclusion, local identity material, dynamic proof input preview availability, Open election state, live contract root match, and current UI-session vote state.
- Guarded dynamic submit re-checks readiness after refreshing live contract state, generates dynamic calldata from local Poseidon proof input material, verifies the calldata public input root matches the dynamic preview root, then calls the existing `Election.castVote(a,b,c,input)` ABI.
- Dynamic submit returns transaction hash, timing, candidate/election IDs, Merkle root, and nullifier hash only; raw identity secrets, passwords, vote choices, proofs, wallets, and private keys remain excluded from UI/exported JSON.
- Admin Demo Mode Guide now presents Static Fixture Mode and Dynamic Poseidon Mode as supported local demo modes. Admin must intentionally fill and confirm the matching root before opening the election.
- Static Fixture Mode uses the static registry fixture root for seeded fixture/static Dashboard submit. Dynamic Poseidon Mode uses the dynamic registry preview root for guarded Dynamic submit.
- Demo mode buttons only fill the existing New Merkle root input. They do not automatically submit `setMerkleRoot`, `openElection`, or any other transaction.
- `cd frontend && npm run build` passed.
- Vite SSR smoke test `npm run smoke:registry-preview` passed for seeded `FIXTURE_POSEIDON`, new `POSEIDON`, missing-scheme `SHA256_DEMO` exclusion, compatible/incompatible counts, direct identity-commitment leaf level, zero padding, warning text, dynamic path generation, overflow blocking, missing identity material path-only behavior, dynamic proof-check blocking for missing material and `SHA256_DEMO`, dynamic vote readiness success/root-mismatch/session-voted states, guarded dynamic submit root-mismatch blocking before `castVote`, admin mode helper static/dynamic/custom/unset classification, and redacted JSON field names.
- Browser smoke `npm run smoke:dynamic-proof` passed in local Chrome for admin login, `/admin` Registry Preview render, refresh action, Admin Demo Mode Guide render, mode button root-fill actions with no root/open transaction, existing `setMerkleRoot` confirmation display, runtime check pass result, dynamic artifact build, dynamic browser proof dev check, public signal/calldata input matching, Dashboard dynamic readiness display for a `POSEIDON` voter, disabled dynamic submit buttons while root readiness is blocked, copy/download JSON actions, path shape, `nullifierHashPreview`, and copied JSON private-field redaction.
- Browser smoke `npm run smoke:dynamic-submit` passed for root-mismatch no-`castVote` behavior, successful mocked dynamic `castVote`, generated calldata public input root matching the dynamic preview root, transaction hash recording, and raw identity secret exclusion.
- Browser smoke `npm run smoke:admin-mode-guide` passed for Admin guide mode display, static/dynamic/custom/unset detection, static/dynamic root-fill buttons, no automatic `setMerkleRoot` or `openElection` transaction from mode buttons, and existing `setMerkleRoot` confirmation behavior.
- Earlier Goal 5.1 Headless Chrome smoke test passed for fixture voter `FIXTURE_POSEIDON`, new voter `POSEIDON`, missing-scheme `SHA256_DEMO`, evidence scheme/redaction checks, and disabled vote buttons for approved-but-not-fixture-compatible voters.
