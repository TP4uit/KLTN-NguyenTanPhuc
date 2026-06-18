import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  FileJson,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildMerkleRootAlignment,
  type MerkleRootAlignment,
} from "../lib/merkleRootAlignment";
import {
  currentElectionId,
  VOTER_REGISTRATIONS_CHANGED_EVENT,
} from "../lib/localVoterRegistration";
import { copyTextToClipboard } from "../lib/registryPreview";

type AlignmentStatus = "idle" | "loading" | "success" | "error";

type AdminMerkleRootAlignmentProps = {
  contractRoot: string;
  onUseFixtureRoot?: (root: string) => void;
};

function formatLongValue(value: string) {
  if (value.length <= 28) {
    return value;
  }

  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
}

function rootCardClass(matches: boolean) {
  return matches ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50";
}

export function AdminMerkleRootAlignment({
  contractRoot,
  onUseFixtureRoot,
}: AdminMerkleRootAlignmentProps) {
  const [alignment, setAlignment] = useState<MerkleRootAlignment | null>(null);
  const [status, setStatus] = useState<AlignmentStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const isLoading = status === "loading";
  const alignmentJson = useMemo(() => (alignment ? JSON.stringify(alignment, null, 2) : ""), [alignment]);

  const refreshAlignment = useCallback(async (successMessage?: string) => {
    setStatus("loading");
    setMessage(null);

    try {
      const nextAlignment = await buildMerkleRootAlignment(contractRoot);
      setAlignment(nextAlignment);
      setStatus(successMessage ? "success" : "idle");
      setMessage(successMessage ?? null);
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error, "Unable to build Merkle root alignment."));
    }
  }, [contractRoot]);

  useEffect(() => {
    void refreshAlignment();
  }, [refreshAlignment]);

  useEffect(() => {
    const handleRegistrationChange = () => {
      void refreshAlignment();
    };

    window.addEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, handleRegistrationChange);

    return () => {
      window.removeEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, handleRegistrationChange);
    };
  }, [refreshAlignment]);

  const copyValue = async (label: string, value: string) => {
    try {
      await copyTextToClipboard(value);
      setStatus("success");
      setMessage(`${label} copied.`);
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error, `Unable to copy ${label.toLowerCase()}.`));
    }
  };

  const handleUseFixtureRoot = () => {
    if (!alignment || !onUseFixtureRoot) {
      return;
    }

    onUseFixtureRoot(alignment.fixtureRoot);
    setStatus("success");
    setMessage("Static proof fixture root filled into the New Merkle root input. No transaction was submitted.");
  };

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Merkle Root Alignment</h2>
          </div>
          <p className="text-sm text-slate-600">
            Election ID: <span className="font-mono font-semibold text-slate-800">{currentElectionId}</span>
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Use the static proof fixture root for the current browser proof demo.
          </p>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-amber-800">
            Do not use registry preview root as contract root until matching Poseidon proof inputs are generated in a later goal.
          </p>
        </div>

        <button
          onClick={() => void refreshAlignment("Merkle root alignment refreshed.")}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh alignment
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {status === "error" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      {alignment ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`rounded-xl border p-4 ${rootCardClass(alignment.contractMatchesFixture)}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-600">Contract root</p>
                {alignment.contractMatchesFixture ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Proof-compatible
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Not proof-compatible
                  </span>
                )}
              </div>
              <p className="break-all font-mono text-sm font-semibold text-slate-950" title={alignment.contractRoot}>
                {alignment.contractRoot}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-emerald-700">Static proof fixture root</p>
                <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Proof-compatible
                </span>
              </div>
              <p className="break-all font-mono text-sm font-semibold text-slate-950" title={alignment.fixtureRoot}>
                {alignment.fixtureRoot}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-amber-700">Registry preview root</p>
                <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700">
                  Preview-only
                </span>
              </div>
              <p className="break-all font-mono text-sm font-semibold text-slate-950" title={alignment.previewRoot}>
                {alignment.previewRoot}
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${rootCardClass(alignment.metadataMatchesFixture)}`}>
              <p className="mb-2 text-sm font-medium text-slate-600">Metadata root</p>
              <p className="break-all font-mono text-sm font-semibold text-slate-950" title={alignment.metadataRoot}>
                {alignment.metadataRoot}
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm font-medium text-blue-700">Recommended root</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950" title={alignment.recommendedRoot}>
              {alignment.recommendedRoot}
            </p>
          </div>

          {alignment.warnings.length > 0 && (
            <div className="mb-6 space-y-2">
              {alignment.warnings.map((warning) => (
                <div
                  key={warning}
                  className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              onClick={() => void copyValue("Fixture root", alignment.fixtureRoot)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Clipboard className="h-4 w-4" />
              Copy fixture root
            </button>
            <button
              onClick={() => void copyValue("Preview root", alignment.previewRoot)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Clipboard className="h-4 w-4" />
              Copy preview root
            </button>
            <button
              onClick={() => void copyValue("Alignment JSON", alignmentJson)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FileJson className="h-4 w-4" />
              Copy alignment JSON
            </button>
            {onUseFixtureRoot && (
              <button
                onClick={handleUseFixtureRoot}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <ShieldCheck className="h-4 w-4" />
                Use fixture root in input
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          {isLoading ? "Building Merkle root alignment..." : "Merkle root alignment is not available."}
        </div>
      )}
    </section>
  );
}
