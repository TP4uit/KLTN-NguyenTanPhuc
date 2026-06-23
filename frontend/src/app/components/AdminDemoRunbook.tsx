import { AlertTriangle, BookOpenCheck, CheckCircle2, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getDemoRunbookState,
  resetAllLocalDemoState,
  resetLocalDemoRegistrations,
  resetLocalDemoSession,
  resetLocalDemoVotingState,
  resetLocalIdentitySecrets,
  type DemoRunbookResetKind,
} from "../lib/demoRunbookState";

type AdminDemoRunbookProps = {
  onResetComplete?: () => void;
};

type ResetAction = {
  kind: DemoRunbookResetKind;
  label: string;
  description: string;
  reset: () => string[];
};

const STATIC_FIXTURE_STEPS = [
  "Choose Static Fixture Mode in Admin Demo Mode Guide.",
  "Sign in as the seeded fixture voter and create/register the voter if needed.",
  "Approve the fixture-compatible registration in Admin Voter Registration Review.",
  "Build Registry Preview and review Merkle Root Alignment.",
  "Confirm setMerkleRoot with the static fixture root.",
  "Confirm openElection after reviewing readiness.",
  "Vote from Dashboard with the static Vote button or fixture fallback.",
  "Inspect Results and export/validate public audit JSON.",
];

const DYNAMIC_POSEIDON_STEPS = [
  "Choose Dynamic Poseidon Mode in Admin Demo Mode Guide.",
  "Create or sign in as a voter and register a Poseidon commitment.",
  "Approve the registration in Admin Voter Registration Review.",
  "Build Registry Preview and Dynamic Proof Input Preview.",
  "Confirm setMerkleRoot with the dynamic preview root.",
  "Confirm openElection after reviewing readiness.",
  "Vote from Dashboard with the guarded Dynamic submit button.",
  "Inspect Results and export/validate public audit JSON.",
];

function formatKeyList(keys: string[]) {
  return keys.length > 0 ? keys : ["No persisted localStorage keys are currently registered for this reset."];
}

export function AdminDemoRunbook({ onResetComplete }: AdminDemoRunbookProps) {
  const [stateVersion, setStateVersion] = useState(0);
  const [pendingReset, setPendingReset] = useState<ResetAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const runbookState = useMemo(() => getDemoRunbookState(), [stateVersion]);
  const resetActions: ResetAction[] = [
    {
      kind: "registrations",
      label: "Reset registrations",
      description: "Clears local voter registration review state.",
      reset: resetLocalDemoRegistrations,
    },
    {
      kind: "identitySecrets",
      label: "Reset identity secrets",
      description: "Clears local demo identity material used for dynamic proof previews.",
      reset: resetLocalIdentitySecrets,
    },
    {
      kind: "session",
      label: "Reset demo session",
      description: "Signs out the current local demo auth session. Seed users are restored on next app load.",
      reset: resetLocalDemoSession,
    },
    {
      kind: "all",
      label: "Reset all local demo state",
      description: "Clears registrations, local identity material, demo auth session/users, and registered UI caches.",
      reset: resetAllLocalDemoState,
    },
  ];

  const refreshState = () => setStateVersion((current) => current + 1);

  const handleConfirmReset = () => {
    if (!pendingReset) {
      return;
    }

    const clearedKeys = pendingReset.reset();
    resetLocalDemoVotingState();
    setMessage(
      `${pendingReset.label} complete. Cleared localStorage keys: ${
        clearedKeys.length > 0 ? clearedKeys.join(", ") : "none"
      }. Contract state was not changed.`,
    );
    setPendingReset(null);
    refreshState();
    onResetComplete?.();
  };

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">End-to-End Demo Runbook</h2>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-slate-600">
            Follow one local demo path from registration through audit. Reset controls below affect only browser demo
            data. They do not reset contract root, election state, on-chain votes, deployed artifacts, registry.local.json,
            election.local.json, or vote calldata fixtures.
          </p>
          <p className="mt-2 text-sm font-medium text-amber-700">
            To reset on-chain contract state, restart or redeploy the local chain separately.
          </p>
        </div>
        <button
          onClick={refreshState}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Refresh runbook state
        </button>
      </div>

      {message && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-950">Static Fixture Mode path</h3>
          <ol className="mt-3 space-y-2 text-sm text-blue-900">
            {STATIC_FIXTURE_STEPS.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="font-semibold text-emerald-950">Dynamic Poseidon Mode path</h3>
          <ol className="mt-3 space-y-2 text-sm text-emerald-900">
            {DYNAMIC_POSEIDON_STEPS.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-900">Local browser reset controls</h3>
        <p className="mt-2 text-sm text-slate-600">
          These buttons clear only listed localStorage keys after in-page confirmation. They never send setMerkleRoot,
          openElection, castVote, or any other contract transaction.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {resetActions.map((action) => (
            <button
              key={action.kind}
              onClick={() => {
                setPendingReset(action);
                setMessage(null);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <span className="block text-sm font-semibold text-slate-900">{action.label}</span>
              <span className="mt-1 block text-xs text-slate-600">{action.description}</span>
              <span className="mt-2 block font-mono text-xs text-slate-500">
                Keys: {formatKeyList(runbookState.resetPlans[action.kind]).join(", ")}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          Present demo keys: {runbookState.presentKeys.length > 0 ? runbookState.presentKeys.join(", ") : "none"}
        </div>
      </div>

      {pendingReset && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="mb-3 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Confirm {pendingReset.label}</div>
              <p className="mt-1">
                This clears only local browser demo data. Contract root, election lifecycle, on-chain votes, and fixture
                files are untouched.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-red-200 bg-white px-3 py-2">
            <p className="font-semibold">localStorage keys to clear</p>
            <ul className="mt-2 space-y-1 font-mono text-xs">
              {formatKeyList(runbookState.resetPlans[pendingReset.kind]).map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleConfirmReset}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Confirm reset
            </button>
            <button
              onClick={() => {
                setPendingReset(null);
                setMessage("Reset cancelled. No local demo state was cleared.");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
