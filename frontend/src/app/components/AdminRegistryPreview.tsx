import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  FileJson,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  currentElectionId,
  VOTER_REGISTRATIONS_CHANGED_EVENT,
} from "../lib/localVoterRegistration";
import {
  buildRegistryPreview,
  copyTextToClipboard,
  downloadJson,
  type RegistryPreview,
} from "../lib/registryPreview";
import {
  runRegistryPreviewDiagnostics,
  type RegistryPreviewDiagnostics,
} from "../lib/registryPreviewDiagnostics";

type PreviewStatus = "idle" | "loading" | "success" | "error";
type DiagnosticStatus = "idle" | "loading" | "passed" | "failed";

const POSEIDON_WARNING =
  "This Poseidon preview root is generated from approved local Poseidon commitments only. It must not be used as the contract root until Goal 5.3 creates matching Merkle paths/proof inputs.";
const POSEIDON_RUNTIME_ERROR = "Poseidon registry preview failed to load in browser runtime.";

function formatLongValue(value: string) {
  if (value.length <= 28) {
    return value;
  }

  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
}

function buildPreviewFilename(electionId: string) {
  return `registry-preview-election-${electionId}.json`;
}

export function AdminRegistryPreview() {
  const [preview, setPreview] = useState<RegistryPreview | null>(null);
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [diagnosticStatus, setDiagnosticStatus] = useState<DiagnosticStatus>("idle");
  const [diagnostics, setDiagnostics] = useState<RegistryPreviewDiagnostics | null>(null);
  const [diagnosticMessage, setDiagnosticMessage] = useState<string | null>(null);
  const isLoading = status === "loading";
  const isDiagnosticLoading = diagnosticStatus === "loading";
  const previewJson = useMemo(() => (preview ? JSON.stringify(preview, null, 2) : ""), [preview]);

  const refreshPreview = useCallback(async (successMessage?: string) => {
    setStatus("loading");
    setMessage(null);

    try {
      const nextPreview = await buildRegistryPreview(currentElectionId);
      setPreview(nextPreview);
      setStatus(successMessage ? "success" : "idle");
      setMessage(successMessage ?? null);
    } catch (error) {
      setStatus("error");
      setMessage(`${POSEIDON_RUNTIME_ERROR} ${getErrorMessage(error, "Unable to build registry preview.")}`);
    }
  }, []);

  useEffect(() => {
    void refreshPreview();

    const handleRegistrationChange = () => {
      void refreshPreview();
    };

    window.addEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, handleRegistrationChange);

    return () => {
      window.removeEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, handleRegistrationChange);
    };
  }, [refreshPreview]);

  const handleCopyPreview = async () => {
    if (!previewJson) {
      return;
    }

    try {
      await copyTextToClipboard(previewJson);
      setStatus("success");
      setMessage("Registry preview JSON copied.");
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error, "Unable to copy registry preview JSON."));
    }
  };

  const handleDownloadPreview = () => {
    if (!preview || !previewJson) {
      return;
    }

    try {
      downloadJson(buildPreviewFilename(preview.electionId), previewJson);
      setStatus("success");
      setMessage("Registry preview JSON download prepared.");
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error, "Unable to download registry preview JSON."));
    }
  };

  const handleRunDiagnostics = async () => {
    setDiagnosticStatus("loading");
    setDiagnostics(null);
    setDiagnosticMessage(null);

    try {
      const nextDiagnostics = await runRegistryPreviewDiagnostics();
      const failedCheck = nextDiagnostics.checks.find((diagnosticCheck) => !diagnosticCheck.passed);

      setDiagnostics(nextDiagnostics);
      setDiagnosticStatus(nextDiagnostics.passed ? "passed" : "failed");
      setDiagnosticMessage(
        nextDiagnostics.passed
          ? `Runtime check passed at ${nextDiagnostics.checkedAt}.`
          : failedCheck?.message ?? "Registry preview runtime check failed.",
      );
    } catch (error) {
      setDiagnosticStatus("failed");
      setDiagnosticMessage(`${POSEIDON_RUNTIME_ERROR} ${getErrorMessage(error, "Runtime check failed.")}`);
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Registry Preview</h2>
          </div>
          <p className="text-sm text-slate-600">
            Election ID: <span className="font-mono font-semibold text-slate-800">{currentElectionId}</span>
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-800">{POSEIDON_WARNING}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => void refreshPreview("Registry preview refreshed.")}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh preview
          </button>
          <button
            onClick={() => void handleRunDiagnostics()}
            disabled={isLoading || isDiagnosticLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDiagnosticLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Run runtime check
          </button>
          <button
            onClick={handleCopyPreview}
            disabled={!previewJson || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Clipboard className="h-4 w-4" />
            Copy registry preview JSON
          </button>
          <button
            onClick={handleDownloadPreview}
            disabled={!previewJson || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Download registry preview JSON
          </button>
        </div>
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

      {diagnosticMessage && (
        <div
          className={`mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            diagnosticStatus === "failed"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {diagnosticStatus === "failed" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div>
            <div className="font-semibold">
              {diagnosticStatus === "failed" ? "Runtime check failed" : "Runtime check passed"}
            </div>
            <div className="mt-1">{diagnosticMessage}</div>
            {diagnostics && (
              <div className="mt-2 text-xs">
                {diagnostics.checks.filter((diagnosticCheck) => diagnosticCheck.passed).length}/
                {diagnostics.checks.length} checks passed.
              </div>
            )}
          </div>
        </div>
      )}

      {preview ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Hash function</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{preview.hashFunction}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Approved commitments</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{preview.approvedCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-700">Compatible</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{preview.compatibleLeafCount}</p>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                preview.incompatibleLeafCount > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  preview.incompatibleLeafCount > 0 ? "text-amber-700" : "text-slate-500"
                }`}
              >
                Incompatible
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  preview.incompatibleLeafCount > 0 ? "text-amber-900" : "text-slate-950"
                }`}
              >
                {preview.incompatibleLeafCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Tree depth</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{preview.treeDepth}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Capacity</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{preview.capacity}</p>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                preview.overflow ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <p className={`text-sm font-medium ${preview.overflow ? "text-red-700" : "text-emerald-700"}`}>
                Overflow
              </p>
              <p className={`mt-1 text-2xl font-bold ${preview.overflow ? "text-red-900" : "text-emerald-900"}`}>
                {preview.overflow ? "Yes" : "No"}
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-500">Poseidon preview-only root</p>
              <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700">
                leaf: {preview.leafFormula}
              </span>
            </div>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950">
              {preview.merkleRootPreview}
            </p>
          </div>

          <div className="mb-6 space-y-2">
            {preview.warnings.map((warning) => (
              <div
                key={warning}
                className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>

          {preview.compatibleLeafCount === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              No Poseidon-compatible approved commitments exist for this election yet.
            </div>
          ) : (
            <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Registration</th>
                    <th className="px-4 py-3">Scheme</th>
                    <th className="px-4 py-3">Identity commitment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {preview.leaves.map((leaf) => (
                    <tr key={leaf.registrationId}>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600">{leaf.registrationId}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {leaf.commitmentScheme}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-slate-900" title={leaf.identityCommitment}>
                          {formatLongValue(leaf.identityCommitment)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.incompatibleLeaves.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-amber-200">
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">Incompatible approved commitments</p>
                <p className="mt-1 text-xs text-amber-800">
                  These approvals are excluded from Poseidon preview leaves.
                </p>
              </div>
              <table className="min-w-full divide-y divide-amber-100 text-sm">
                <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-amber-700">
                  <tr>
                    <th className="px-4 py-3">Registration</th>
                    <th className="px-4 py-3">Scheme</th>
                    <th className="px-4 py-3">Identity commitment</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 bg-white">
                  {preview.incompatibleLeaves.map((leaf) => (
                    <tr key={leaf.registrationId}>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600">{leaf.registrationId}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {leaf.commitmentScheme}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-slate-900" title={leaf.identityCommitment}>
                          {formatLongValue(leaf.identityCommitment)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-700">{leaf.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          {isLoading ? "Building registry preview..." : "Registry preview is not available."}
        </div>
      )}
    </section>
  );
}
