# Thesis Demo and Verification Mapping

This document maps the implemented local MVP features to thesis/report sections, demo routes, verification evidence, and screenshots. The system is a local thesis demo, not production election infrastructure.

## Current MVP Scope

The MVP demonstrates a ZK anonymous voting flow with a local Hardhat contract, Circom/Groth16 proof artifacts, local registry fixtures, frontend demo roles, admin-reviewed local registrations, two local root modes, guarded vote submission, Results audit export, public evidence package export, and auditor package review.

The main boundaries are:

- On-chain: election lifecycle, Merkle root, nullifier reuse prevention, proof verification, and vote tallies.
- Frontend-local: demo auth, voter registration review state, local identity material, dynamic registry preview, audit package assembly, and browser reset controls.
- Generated fixtures: deterministic registry, proof calldata, browser proving assets, and benchmark evidence.

## Feature Map

| Feature | Purpose | Key files | Demo route/page | Verification | Suggested screenshots | Known limitation |
| --- | --- | --- | --- | --- | --- | --- |
| Smart contract election lifecycle | Show Registration -> Open -> Closed control, root finalization, one-vote nullifier protection, and tally storage. | `contracts/Election.sol`, `test/Election.test.ts`, `scripts/deploy-local.ts`, `scripts/benchmark-gas.ts` | `/admin`, `/results` | `npm test`, `npm run benchmark:gas` | Admin lifecycle controls; Open Election readiness; Results after close | Local Hardhat deployment only; no production governance or ceremony. |
| ZK circuit and public inputs | Prove membership, candidate validity, election binding, and public nullifier/root signals. | `circuits/vote.circom`, `contracts/Verifier.sol`, `scripts/proof-generate.mjs`, `scripts/proof-calldata.mjs` | Dashboard submit paths use generated/browser proving assets | `npm run proof:generate`, `npm run proof:calldata`, `npm run audit:proof`, `npm run audit:calldata` | Public input order diagram or proof artifact evidence | Circuit is fixed depth-3 and depends on generated artifacts. |
| Local registry/proof fixture | Provide deterministic fixture root, Merkle path, proof calldata, and browser proving assets. | `scripts/registry-generate.mjs`, `scripts/merkle-registry.mjs`, `frontend/src/contracts/registry.local.json`, `frontend/src/contracts/vote.calldata.local.json` | `/admin`, `/dashboard` | `npm run registry:generate`, `npm run audit:registry`, `npm run frontend:sync-fixtures` | Static fixture root in Admin mode guide; static submit readiness | Fixture contains demo-only secret material and is not production key management. |
| Frontend auth and roles | Separate voter, admin, and auditor demo experiences. | `frontend/src/app/lib/localAuth.ts`, `frontend/src/app/lib/authContext.tsx`, `frontend/src/app/components/RequireAuth.tsx`, `frontend/src/app/routes.tsx` | `/login`, `/register`, `/account` | Browser smoke history in `docs/CODEX_GOALS.md`; `cd frontend && npm run build` | Login with demo accounts; account role state | Browser-local auth only; not a real identity provider. |
| Voter registration review | Demonstrate local onboarding, approval, rejection, and evidence counts. | `frontend/src/app/lib/localVoterRegistration.ts`, `frontend/src/app/components/VoterRegistrationPanel.tsx`, `frontend/src/app/components/AdminVoterRegistrationManager.tsx` | `/dashboard`, `/admin`, `/account` | `cd frontend && npm run smoke:registry-preview` | Voter registration panel; Admin registration review table | Registration state is frontend-local and does not insert leaves on-chain. |
| Static Fixture Mode | Run the original fixture-compatible voting path. | `frontend/src/app/components/AdminDemoModeGuide.tsx`, `frontend/src/app/lib/browserProof.ts`, `frontend/src/contracts/registry.local.json` | `/admin`, `/dashboard` | `cd frontend && npm run smoke:registry-preview`, `cd frontend && npm run smoke:results-audit` | Static Fixture Mode selected; Dashboard static readiness | Tied to the seeded fixture root and fixture-compatible identity. |
| Dynamic Poseidon Mode | Build a local Poseidon preview root from approved Poseidon commitments and enable guarded Dynamic submit. | `frontend/src/app/lib/registryPreview.ts`, `frontend/src/app/lib/dynamicProofInputPreview.ts`, `frontend/src/app/lib/dynamicVoteReadiness.ts`, `frontend/src/app/pages/Dashboard.tsx` | `/admin`, `/dashboard` | `cd frontend && npm run smoke:registry-preview`; browser smoke names in `frontend/package.json` | Registry Preview; Dynamic Proof Input Preview; Dynamic Vote Readiness | Preview root is demo-only and depends on local identity material and matching proof inputs. |
| Admin root/lifecycle controls | Make root selection and election opening explicit and auditable. | `frontend/src/app/pages/Admin.tsx`, `frontend/src/app/components/AdminMerkleRootAlignment.tsx`, `frontend/src/app/components/AdminDemoModeGuide.tsx` | `/admin` | `cd frontend && npm run smoke:registry-preview`; Goal 5 browser smoke notes | Merkle root alignment; set root confirmation; Open Election readiness | Admin actions are local contract writes; mode buttons only fill input, not submit automatically. |
| Dashboard vote submission | Submit static fixture or guarded dynamic votes only when readiness checks pass. | `frontend/src/app/pages/Dashboard.tsx`, `frontend/src/app/lib/browserProof.ts`, `frontend/src/app/lib/dynamicVoteSubmit.ts` | `/dashboard` | `cd frontend && npm run smoke:registry-preview`; browser smoke notes for dynamic submit | Candidate cards; static/dynamic readiness; successful submit state | Current flows are local demo paths, not production wallet/session policy. |
| Results audit export | Export public on-chain tally/root/mode context. | `frontend/src/app/pages/Results.tsx`, `frontend/src/app/lib/electionResults.ts` | `/results` | `cd frontend && npm run smoke:results-audit` | Results demo mode/root section; Audit Export summary | Audit JSON is contract/root-level context, not per-vote provenance. |
| Public evidence package | Combine Results audit, registration evidence, registry preview, warnings, and checks. | `frontend/src/app/lib/demoEvidencePackage.ts`, `frontend/src/app/pages/Results.tsx` | `/results` | `cd frontend && npm run smoke:evidence-package` | Public Evidence Package summary; copy/download actions | Public identity commitments may appear only as registry commitments. |
| Auditor package review | Validate raw Results audit JSON or full evidence packages and produce a public review report. | `frontend/src/app/pages/Audit.tsx`, `frontend/src/app/lib/demoEvidencePackage.ts` | `/audit` | `cd frontend && npm run smoke:results-audit`, `cd frontend && npm run smoke:evidence-package` | Evidence Package Review; Final Auditor Verdict; live comparison table | Public demo audit support only; not a cryptographic proof of per-vote provenance. |

## Thesis Section Suggestions

- System design: Smart contract lifecycle, public input order, local registry fixture, and frontend role model.
- Implementation: Static Fixture Mode, Dynamic Poseidon Mode, guarded submit logic, and admin root lifecycle controls.
- Evaluation: Hardhat tests, generated audit reports, benchmark report, smoke tests, Results audit export, and evidence package review.
- Limitations: local demo auth, local registration state, no production ceremony, no dynamic on-chain Merkle insertion, no per-vote provenance proof in evidence packages.

