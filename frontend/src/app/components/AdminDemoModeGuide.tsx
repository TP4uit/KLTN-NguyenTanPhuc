import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  buildDemoModeReadiness,
  type DemoMode,
  type DemoModeReadiness,
} from "../lib/demoModeReadiness";
import { formatLongValue, type ElectionStateName } from "../lib/localElection";
import { VOTER_REGISTRATIONS_CHANGED_EVENT } from "../lib/localVoterRegistration";

type AdminDemoModeGuideProps = {
  contractRoot: string;
  lifecycleState: number;
  lifecycleStateName: ElectionStateName;
  onUseStaticRoot: (root: string) => void;
  onUseDynamicRoot: (root: string) => void;
  disabled?: boolean;
};

function modeLabel(mode: DemoMode) {
  switch (mode) {
    case "STATIC_FIXTURE":
      return "Static Fixture Mode";
    case "DYNAMIC_POSEIDON":
      return "Dynamic Poseidon Mode";
    case "CUSTOM":
      return "Custom root";
    case "UNSET":
      return "Unset root";
  }
}

function modeBadgeClass(mode: DemoMode) {
  switch (mode) {
    case "STATIC_FIXTURE":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "DYNAMIC_POSEIDON":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "CUSTOM":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "UNSET":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

type ModeCardProps = {
  title: string;
  root: string;
  active: boolean;
  icon: "shield" | "zap";
  supports: string;
  caveat: string;
  buttonLabel: string;
  onUseRoot: () => void;
  disabled?: boolean;
};

function ModeCard({
  title,
  root,
  active,
  icon,
  supports,
  caveat,
  buttonLabel,
  onUseRoot,
  disabled,
}: ModeCardProps) {
  const Icon = icon === "shield" ? ShieldCheck : Zap;

  return (
    <div
      className={`rounded-xl border p-4 ${
        active ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={active ? "h-5 w-5 text-emerald-600" : "h-5 w-5 text-slate-500"} />
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        {active && (
          <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Active
          </span>
        )}
      </div>
      <p className="break-all font-mono text-xs font-semibold text-slate-950" title={root}>
        {root}
      </p>
      <p className="mt-2 text-xs text-slate-500">{formatLongValue(root)}</p>
      <div className="mt-4 space-y-2 text-sm">
        <p className="text-slate-700">{supports}</p>
        <p className="text-amber-700">{caveat}</p>
      </div>
      <button
        onClick={onUseRoot}
        disabled={disabled}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

export function AdminDemoModeGuide({
  contractRoot,
  lifecycleState,
  lifecycleStateName,
  onUseStaticRoot,
  onUseDynamicRoot,
  disabled,
}: AdminDemoModeGuideProps) {
  const [readiness, setReadiness] = useState<DemoModeReadiness | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const nextReadiness = await buildDemoModeReadiness(contractRoot, lifecycleState);
      setReadiness(nextReadiness);
      setStatus("idle");
    } catch (error) {
      setReadiness(null);
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to build demo mode guide.");
    }
  }, [contractRoot, lifecycleState]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleRegistrationChange = () => {
      void refresh();
    };

    window.addEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, handleRegistrationChange);

    return () => {
      window.removeEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, handleRegistrationChange);
    };
  }, [refresh]);

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Admin Demo Mode Guide</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Choose the root mode before setting the Merkle root or opening the election. Mode buttons only fill the New
            Merkle root input; they never submit setMerkleRoot or openElection.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={status === "loading"}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh mode guide
        </button>
      </div>

      {errorMessage && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {readiness ? (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Detected active mode</p>
              <span
                className={`mt-2 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${modeBadgeClass(
                  readiness.activeMode,
                )}`}
              >
                {modeLabel(readiness.activeMode)}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Election state</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {lifecycleStateName} ({lifecycleState})
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Current contract root</p>
              <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">
                {readiness.contractRoot || "Unset"}
              </p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ModeCard
              title="Static Fixture Mode"
              root={readiness.staticFixtureRoot}
              active={readiness.activeMode === "STATIC_FIXTURE"}
              icon="shield"
              supports="Supports the seeded fixture voter and the static Dashboard submit path."
              caveat="Guarded Dynamic submit is likely blocked unless the dynamic preview root matches this fixture root."
              buttonLabel="Use static fixture root in input"
              onUseRoot={() => onUseStaticRoot(readiness.staticFixtureRoot)}
              disabled={disabled}
            />
            <ModeCard
              title="Dynamic Poseidon Mode"
              root={readiness.dynamicPreviewRoot}
              active={readiness.activeMode === "DYNAMIC_POSEIDON"}
              icon="zap"
              supports="Supports guarded Dynamic submit for approved Poseidon voters when readiness succeeds."
              caveat="Static fixture submit is likely blocked unless the static fixture root matches this preview root."
              buttonLabel="Use dynamic preview root in input"
              onUseRoot={() => onUseDynamicRoot(readiness.dynamicPreviewRoot)}
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Mode readiness
              </div>
              <p>Static Fixture Mode: {readiness.staticModeReady ? "ready" : "not active"}</p>
              <p className="mt-1">Dynamic Poseidon Mode: {readiness.dynamicModeReady ? "ready" : "not active"}</p>
              <p className="mt-3 text-xs text-slate-500">Metadata root: {formatLongValue(readiness.metadataRoot)}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Safety notes
              </div>
              <ul className="space-y-1">
                {[...readiness.warnings, ...readiness.recommendedActions].map((note) => (
                  <li key={note}>- {note}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          {status === "loading" ? "Building demo mode guide..." : "Demo mode guide is not available."}
        </div>
      )}
    </section>
  );
}
