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
import { CANDIDATES } from "../lib/candidates";
import {
  buildDynamicProofInputPreview,
  getDynamicProofInputReadiness,
  type DynamicProofInputPreview,
  type DynamicProofInputReadiness,
} from "../lib/dynamicProofInputPreview";
import {
  currentElectionId,
  getRegistrationCommitmentScheme,
  listRegistrations,
  VOTER_REGISTRATIONS_CHANGED_EVENT,
} from "../lib/localVoterRegistration";
import { copyTextToClipboard, downloadJson } from "../lib/registryPreview";
import type { VoterRegistration } from "../lib/voterRegistrationModel";

type PreviewStatus = "idle" | "loading" | "success" | "error";

type RegistrationOption = {
  registration: VoterRegistration;
  readiness: DynamicProofInputReadiness;
};

const COMPATIBLE_SCHEMES = new Set(["POSEIDON", "FIXTURE_POSEIDON"]);

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
}

function formatLongValue(value: string) {
  if (value.length <= 28) {
    return value;
  }

  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function buildPreviewFilename(electionId: string, registrationId: string) {
  return `dynamic-proof-input-preview-election-${electionId}-${registrationId}.json`;
}

async function loadRegistrationOptions() {
  const registrations = listRegistrations(currentElectionId).filter((registration) => {
    const commitmentScheme = getRegistrationCommitmentScheme(registration);
    return registration.status === "APPROVED" && COMPATIBLE_SCHEMES.has(commitmentScheme);
  });
  const options = await Promise.all(
    registrations.map(async (registration) => ({
      registration,
      readiness: await getDynamicProofInputReadiness(registration),
    })),
  );

  return options.sort((left, right) => {
    const byCommitment = left.registration.identityCommitment.localeCompare(right.registration.identityCommitment);

    if (byCommitment !== 0) {
      return byCommitment;
    }

    return left.registration.id.localeCompare(right.registration.id);
  });
}

export function AdminDynamicProofInputPreview() {
  const [options, setOptions] = useState<RegistrationOption[]>([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState("");
  const [candidateId, setCandidateId] = useState(CANDIDATES[0]?.candidateId.toString() ?? "1");
  const [artifact, setArtifact] = useState<DynamicProofInputPreview | null>(null);
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const isLoading = status === "loading";
  const artifactJson = useMemo(() => (artifact ? JSON.stringify(artifact, null, 2) : ""), [artifact]);
  const selectedOption = useMemo(
    () => options.find((option) => option.registration.id === selectedRegistrationId) ?? null,
    [options, selectedRegistrationId],
  );

  const refreshOptions = useCallback(async (successMessage?: string) => {
    setStatus("loading");
    setMessage(null);

    try {
      const nextOptions = await loadRegistrationOptions();
      setOptions(nextOptions);
      setSelectedRegistrationId((currentRegistrationId) => {
        if (nextOptions.some((option) => option.registration.id === currentRegistrationId)) {
          return currentRegistrationId;
        }

        return nextOptions[0]?.registration.id ?? "";
      });
      setArtifact(null);
      setStatus(successMessage ? "success" : "idle");
      setMessage(successMessage ?? null);
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error, "Unable to load dynamic artifact preview registrations."));
    }
  }, []);

  useEffect(() => {
    void refreshOptions();

    const handleRegistrationChange = () => {
      void refreshOptions();
    };

    window.addEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, handleRegistrationChange);

    return () => {
      window.removeEventListener(VOTER_REGISTRATIONS_CHANGED_EVENT, handleRegistrationChange);
    };
  }, [refreshOptions]);

  const handleBuildArtifact = async () => {
    if (!selectedRegistrationId) {
      setStatus("error");
      setMessage("Select an approved Poseidon registration first.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const nextArtifact = await buildDynamicProofInputPreview(selectedRegistrationId, candidateId);
      setArtifact(nextArtifact);
      setStatus("success");
      setMessage(
        nextArtifact.fullInputReady
          ? "Dynamic proof input artifact preview generated."
          : "Merkle path preview generated; full artifact is waiting on local identity material.",
      );
    } catch (error) {
      setArtifact(null);
      setStatus("error");
      setMessage(getErrorMessage(error, "Unable to generate dynamic proof input artifact preview."));
    }
  };

  const handleCopyArtifact = async () => {
    if (!artifactJson) {
      return;
    }

    try {
      await copyTextToClipboard(artifactJson);
      setStatus("success");
      setMessage("Dynamic artifact preview JSON copied.");
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error, "Unable to copy dynamic artifact preview JSON."));
    }
  };

  const handleDownloadArtifact = () => {
    if (!artifact || !artifactJson) {
      return;
    }

    try {
      downloadJson(buildPreviewFilename(artifact.electionId, artifact.registrationId), artifactJson);
      setStatus("success");
      setMessage("Dynamic artifact preview JSON download prepared.");
    } catch (error) {
      setStatus("error");
      setMessage(getErrorMessage(error, "Unable to download dynamic artifact preview JSON."));
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Dynamic Proof Input Preview</h2>
          </div>
          <p className="text-sm text-slate-600">
            Election ID: <span className="font-mono font-semibold text-slate-800">{currentElectionId}</span>
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-800">
            Dynamic proof input preview only. Dashboard voting still uses the static fixture proof path.
          </p>
        </div>

        <button
          onClick={() => void refreshOptions("Dynamic artifact registrations refreshed.")}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh registrations
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

      {options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          No approved Poseidon-compatible registrations are available for dynamic artifact preview.
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(180px,0.6fr)_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Approved Poseidon registration</span>
              <select
                value={selectedRegistrationId}
                onChange={(event) => {
                  setSelectedRegistrationId(event.target.value);
                  setArtifact(null);
                }}
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                {options.map(({ registration, readiness }) => (
                  <option key={registration.id} value={registration.id}>
                    {registration.id} - {getRegistrationCommitmentScheme(registration)} - {readiness.status}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Candidate ID</span>
              <select
                value={candidateId}
                onChange={(event) => {
                  setCandidateId(event.target.value);
                  setArtifact(null);
                }}
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                {CANDIDATES.map((candidate) => (
                  <option key={candidate.id} value={candidate.candidateId}>
                    {candidate.candidateId} - {candidate.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={handleBuildArtifact}
              disabled={!selectedRegistrationId || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
              Build preview
            </button>
          </div>

          {selectedOption && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Readiness:</span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    selectedOption.readiness.status === "READY"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : selectedOption.readiness.status === "PATH_ONLY"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {selectedOption.readiness.status}
                </span>
              </div>
              <p className="mt-2">{selectedOption.readiness.reason}</p>
            </div>
          )}

          {artifact && (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Leaf index</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{artifact.leafIndex}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Candidate ID</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{artifact.candidateId}</p>
                </div>
                <div
                  className={`rounded-xl border p-4 ${
                    artifact.fullInputReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      artifact.fullInputReady ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    Full artifact
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold ${
                      artifact.fullInputReady ? "text-emerald-900" : "text-amber-900"
                    }`}
                  >
                    {artifact.fullInputReady ? "Ready" : "Path only"}
                  </p>
                </div>
              </div>

              <div className="mb-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-500">merkleRootPreview</p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950">
                    {artifact.merkleRootPreview}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-500">identityCommitment</p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950">
                    {formatLongValue(artifact.identityCommitment)}
                  </p>
                </div>
                {artifact.nullifierHashPreview && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-500">nullifierHashPreview</p>
                    <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950">
                      {artifact.nullifierHashPreview}
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    pathElements
                  </div>
                  <div className="divide-y divide-slate-100 bg-white">
                    {artifact.pathElements.map((pathElement, index) => (
                      <div key={`${pathElement}-${index}`} className="px-4 py-3">
                        <p className="text-xs font-medium text-slate-500">Level {index}</p>
                        <p className="mt-1 break-all font-mono text-xs text-slate-900">{pathElement}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    pathIndices
                  </div>
                  <div className="px-4 py-3 font-mono text-sm text-slate-900">
                    [{artifact.pathIndices.join(", ")}]
                  </div>
                </div>
              </div>

              <div className="mb-6 space-y-2">
                {artifact.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleCopyArtifact}
                  disabled={!artifactJson || isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Clipboard className="h-4 w-4" />
                  Copy JSON
                </button>
                <button
                  onClick={handleDownloadArtifact}
                  disabled={!artifactJson || isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Download JSON
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
