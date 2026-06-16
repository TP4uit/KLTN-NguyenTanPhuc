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
