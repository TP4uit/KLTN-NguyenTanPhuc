import { AlertCircle, CheckCircle2, Clipboard, Download, FileCheck2, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import {
  collectForbiddenDemoEvidencePackagePaths,
  isDemoEvidencePackage,
  validateDemoEvidencePackage,
  type DemoEvidencePackage,
  type DemoEvidencePackageValidation,
} from "../lib/demoEvidencePackage";
import {
  isResultsAuditSnapshot,
  readOnChainElectionResults,
  validateResultsAuditSnapshot,
  type ResultsAuditSnapshot,
  type ResultsAuditValidation,
} from "../lib/electionResults";
import { connectLocalElection, formatLongValue, localElection } from "../lib/localElection";
import { copyTextToClipboard, downloadJson } from "../lib/registryPreview";

type LiveComparisonStatus = "idle" | "loading" | "success" | "error";

type ComparisonRow = {
  label: string;
  auditValue: string;
  currentValue: string;
  matches: boolean;
};

type EvidencePackageVerdict = "Valid package" | "Valid with warnings" | "Invalid package";

export type AuditImportValidationResult = {
  validation: ResultsAuditValidation;
  packageValidation: DemoEvidencePackageValidation | null;
  auditSnapshot: ResultsAuditSnapshot | null;
  evidencePackage: DemoEvidencePackage | null;
};

export type EvidencePackageReviewReport = {
  reportVersion: string;
  generatedAt: string;
  packageMetadata: {
    packageVersion: string;
    packageGeneratedAt: string;
    electionId: string;
    network: string;
    chainId: string;
    contractAddress: string;
    demoMode: DemoEvidencePackage["demoMode"];
    merkleRoot: string;
  };
  verdict: EvidencePackageVerdict;
  checks: DemoEvidencePackage["checks"];
  errors: string[];
  warnings: string[];
  liveComparison: null | {
    generatedAt: string;
    allMatched: boolean;
    rows: ComparisonRow[];
  };
};

function formatValue(value: string | number | null) {
  if (value === null) {
    return "null";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

export function getEvidencePackageVerdict(packageValidation: DemoEvidencePackageValidation | null): EvidencePackageVerdict {
  if (!packageValidation?.isValid) {
    return "Invalid package";
  }

  return packageValidation.warnings.length > 0 ? "Valid with warnings" : "Valid package";
}

function demoModeExplanation(mode: DemoEvidencePackage["demoMode"]) {
  if (mode === "STATIC_FIXTURE") {
    return "Static Fixture Mode means the Results root matches the seeded proof fixture root.";
  }

  if (mode === "DYNAMIC_POSEIDON") {
    return "Dynamic Poseidon Mode means the Results root matches the local Poseidon registry preview root.";
  }

  if (mode === "CUSTOM") {
    return "Custom mode means the Results root does not match the static fixture root or local Poseidon preview root.";
  }

  return "Unset mode means the Results root is empty or zero.";
}

export function buildEvidencePackageReviewReport(input: {
  evidencePackage: DemoEvidencePackage;
  packageValidation: DemoEvidencePackageValidation;
  comparisonRows?: ComparisonRow[];
}): EvidencePackageReviewReport {
  const report: EvidencePackageReviewReport = {
    reportVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    packageMetadata: {
      packageVersion: input.evidencePackage.packageVersion,
      packageGeneratedAt: input.evidencePackage.generatedAt,
      electionId: input.evidencePackage.electionId,
      network: input.evidencePackage.network,
      chainId: input.evidencePackage.chainId,
      contractAddress: input.evidencePackage.contractAddress,
      demoMode: input.evidencePackage.demoMode,
      merkleRoot: input.evidencePackage.merkleRoot,
    },
    verdict: getEvidencePackageVerdict(input.packageValidation),
    checks: input.evidencePackage.checks,
    errors: input.packageValidation.errors,
    warnings: uniqueStrings([
      ...input.packageValidation.warnings,
      "This package review is public demo audit support only, not a cryptographic proof of per-vote provenance.",
    ]),
    liveComparison: input.comparisonRows?.length
      ? {
          generatedAt: new Date().toISOString(),
          allMatched: input.comparisonRows.every((row) => row.matches),
          rows: input.comparisonRows,
        }
      : null,
  };
  const forbiddenPaths = collectForbiddenDemoEvidencePackagePaths(report);

  if (forbiddenPaths.length > 0) {
    return {
      ...report,
      verdict: "Invalid package",
      errors: [
        ...report.errors,
        `Normalized review report contains forbidden private fields: ${forbiddenPaths.join(", ")}.`,
      ],
    };
  }

  return report;
}

export function createComparisonRows(auditSnapshot: ResultsAuditSnapshot, currentSnapshot: Awaited<ReturnType<typeof readOnChainElectionResults>>) {
  const currentTalliesById = new Map(
    currentSnapshot.results.map((candidate) => [candidate.candidateId, candidate.votes]),
  );
  const rows: ComparisonRow[] = [
    {
      label: "Election ID",
      auditValue: auditSnapshot.electionId,
      currentValue: localElection.electionId,
      matches: auditSnapshot.electionId === localElection.electionId,
    },
    {
      label: "Chain ID",
      auditValue: auditSnapshot.chainId,
      currentValue: localElection.chainId,
      matches: auditSnapshot.chainId === localElection.chainId,
    },
    {
      label: "Contract address",
      auditValue: auditSnapshot.contractAddress.toLowerCase(),
      currentValue: localElection.election.address.toLowerCase(),
      matches: auditSnapshot.contractAddress.toLowerCase() === localElection.election.address.toLowerCase(),
    },
    {
      label: "Merkle root",
      auditValue: auditSnapshot.merkleRoot,
      currentValue: currentSnapshot.merkleRoot,
      matches: auditSnapshot.merkleRoot === currentSnapshot.merkleRoot,
    },
    {
      label: "Demo mode",
      auditValue: auditSnapshot.demoMode,
      currentValue: currentSnapshot.demoMode,
      matches: auditSnapshot.demoMode === currentSnapshot.demoMode,
    },
    {
      label: "Matches static fixture root",
      auditValue: String(auditSnapshot.rootMatchesStaticFixture),
      currentValue: String(currentSnapshot.rootMatchesStaticFixture),
      matches: auditSnapshot.rootMatchesStaticFixture === currentSnapshot.rootMatchesStaticFixture,
    },
    {
      label: "Matches dynamic Poseidon root",
      auditValue: String(auditSnapshot.rootMatchesDynamicPoseidon),
      currentValue: String(currentSnapshot.rootMatchesDynamicPoseidon),
      matches: auditSnapshot.rootMatchesDynamicPoseidon === currentSnapshot.rootMatchesDynamicPoseidon,
    },
    {
      label: "Total votes",
      auditValue: auditSnapshot.totalVotes.toString(),
      currentValue: currentSnapshot.totalVotes.toString(),
      matches: auditSnapshot.totalVotes === currentSnapshot.totalVotes,
    },
    {
      label: "Election state",
      auditValue: `${auditSnapshot.electionState} (${auditSnapshot.electionStateName})`,
      currentValue: `${currentSnapshot.lifecycle.electionState} (${currentSnapshot.lifecycle.electionStateName})`,
      matches: auditSnapshot.electionState === currentSnapshot.lifecycle.electionState,
    },
  ];

  auditSnapshot.candidateTallies.forEach((candidate) => {
    const currentVotes = currentTalliesById.get(candidate.candidateId);

    rows.push({
      label: `Candidate ${candidate.candidateId} votes`,
      auditValue: candidate.votes.toString(),
      currentValue: currentVotes === undefined ? "Missing" : currentVotes.toString(),
      matches: currentVotes === candidate.votes,
    });
  });

  return rows;
}

export function validateAuditImport(parsedJson: unknown): AuditImportValidationResult {
  if (isDemoEvidencePackage(parsedJson) || (isRecord(parsedJson) && "resultsAudit" in parsedJson)) {
    const nextPackageValidation = validateDemoEvidencePackage(parsedJson);
    const nextEvidencePackage = isDemoEvidencePackage(parsedJson) ? parsedJson : null;
    const nextAuditSnapshot = nextEvidencePackage?.resultsAudit ??
      (isRecord(parsedJson) && isResultsAuditSnapshot(parsedJson.resultsAudit) ? parsedJson.resultsAudit : null);

    return {
      validation: nextPackageValidation.resultsAuditValidation,
      packageValidation: nextPackageValidation,
      auditSnapshot: nextAuditSnapshot,
      evidencePackage: nextEvidencePackage,
    };
  }

  const nextValidation = validateResultsAuditSnapshot(parsedJson);

  return {
    validation: nextValidation,
    packageValidation: null,
    auditSnapshot: isResultsAuditSnapshot(parsedJson) ? parsedJson : null,
    evidencePackage: null,
  };
}

export function Audit() {
  const [rawJson, setRawJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ResultsAuditValidation | null>(null);
  const [packageValidation, setPackageValidation] = useState<DemoEvidencePackageValidation | null>(null);
  const [auditSnapshot, setAuditSnapshot] = useState<ResultsAuditSnapshot | null>(null);
  const [evidencePackage, setEvidencePackage] = useState<DemoEvidencePackage | null>(null);
  const [comparisonStatus, setComparisonStatus] = useState<LiveComparisonStatus>("idle");
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [reviewReportMessage, setReviewReportMessage] = useState<string | null>(null);
  const candidateSum = useMemo(
    () => auditSnapshot?.candidateTallies.reduce((sum, candidate) => sum + candidate.votes, 0) ?? null,
    [auditSnapshot],
  );
  const hasInput = rawJson.trim().length > 0;
  const importIsValid = packageValidation ? packageValidation.isValid : validation?.isValid;
  const packageVerdict = getEvidencePackageVerdict(packageValidation);
  const packageReviewReport = useMemo(
    () =>
      evidencePackage && packageValidation
        ? buildEvidencePackageReviewReport({
            evidencePackage,
            packageValidation,
            comparisonRows,
          })
        : null,
    [comparisonRows, evidencePackage, packageValidation],
  );

  const handleValidate = () => {
    setParseError(null);
    setValidation(null);
    setPackageValidation(null);
    setAuditSnapshot(null);
    setEvidencePackage(null);
    setComparisonStatus("idle");
    setComparisonRows([]);
    setComparisonError(null);
    setReviewReportMessage(null);

    try {
      const parsedJson: unknown = JSON.parse(rawJson);
      const importResult = validateAuditImport(parsedJson);

      setValidation(importResult.validation);
      setPackageValidation(importResult.packageValidation);
      setAuditSnapshot(importResult.auditSnapshot);
      setEvidencePackage(importResult.evidencePackage);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Audit JSON could not be parsed.");
    }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      setRawJson(await file.text());
      setParseError(null);
      setValidation(null);
      setPackageValidation(null);
      setAuditSnapshot(null);
      setEvidencePackage(null);
      setComparisonRows([]);
      setComparisonError(null);
      setComparisonStatus("idle");
      setReviewReportMessage(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to read JSON file.");
    }
  };

  const handleClear = () => {
    setRawJson("");
    setParseError(null);
    setValidation(null);
    setPackageValidation(null);
    setAuditSnapshot(null);
    setEvidencePackage(null);
    setComparisonStatus("idle");
    setComparisonRows([]);
    setComparisonError(null);
    setReviewReportMessage(null);
  };

  const handleCopyReviewReport = async () => {
    if (!packageReviewReport) {
      setReviewReportMessage("Import and validate a public evidence package before copying a review report.");
      return;
    }

    try {
      await copyTextToClipboard(JSON.stringify(packageReviewReport, null, 2));
      setReviewReportMessage("Normalized review report copied.");
    } catch (error) {
      setReviewReportMessage(error instanceof Error ? error.message : "Unable to copy normalized review report.");
    }
  };

  const handleDownloadReviewReport = () => {
    if (!packageReviewReport) {
      setReviewReportMessage("Import and validate a public evidence package before downloading a review report.");
      return;
    }

    downloadJson(
      `zkvote-evidence-review-${packageReviewReport.packageMetadata.electionId}.json`,
      JSON.stringify(packageReviewReport, null, 2),
    );
    setReviewReportMessage("Normalized review report download started.");
  };

  const handleLiveComparison = async () => {
    if (!auditSnapshot || !importIsValid) {
      setComparisonStatus("error");
      setComparisonError("Validate a Results audit JSON or public evidence package before comparing with current on-chain tallies.");
      return;
    }

    setComparisonStatus("loading");
    setComparisonError(null);
    setComparisonRows([]);

    try {
      const connection = await connectLocalElection();
      const currentSnapshot = await readOnChainElectionResults(connection.contract, connection.provider);

      setComparisonRows(createComparisonRows(auditSnapshot, currentSnapshot));
      setComparisonStatus("success");
    } catch (error) {
      setComparisonStatus("error");
      setComparisonError(error instanceof Error ? error.message : "Unable to compare with current on-chain tallies.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Audit Verification</h1>
          </div>
          <p className="max-w-3xl text-lg text-slate-600">
            Import a Results audit JSON or a public evidence package and validate that its public tally fields are internally consistent.
          </p>
          <p className="max-w-4xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Audit verification uses public tally JSON only. It must not contain voter identities, secrets, proofs,
            raw nullifiers, vote choices, candidate choices, private wallet data, or transaction hashes.
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Import Audit JSON</h2>
              <p className="mt-1 text-sm text-slate-500">Paste a Results audit export, public evidence package, or upload a `.json` file.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                Upload .json
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(event) => {
                    void handleUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={handleClear}
                disabled={!hasInput}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </button>
              <button
                onClick={handleValidate}
                disabled={!hasInput}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Validate
              </button>
            </div>
          </div>

          <textarea
            value={rawJson}
            onChange={(event) => setRawJson(event.target.value)}
            className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            placeholder='Paste zkvote-results-audit-<electionId>.json here'
            spellCheck={false}
          />

          {parseError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Parse error: {parseError}</span>
            </div>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Verification Summary</h2>
              <p className="mt-1 text-sm text-slate-500">Validation checks shape, public tally math, source flags, and forbidden private fields.</p>
            </div>
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${
                importIsValid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : validation
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {importIsValid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {importIsValid ? "Valid" : validation ? "Invalid" : "Not validated"}
            </span>
          </div>

          {auditSnapshot ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Election ID</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{auditSnapshot.electionId}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{auditSnapshot.source}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Latest block</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{auditSnapshot.latestBlock.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total votes</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{auditSnapshot.totalVotes.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <div className="font-semibold">Imported Demo Mode / Merkle Root</div>
                <p className="mt-1 text-blue-800">
                  This is contract/root-level context for the tally, not per-vote provenance.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <span>demoMode: <span className="font-mono">{auditSnapshot.demoMode}</span></span>
                  <span title={auditSnapshot.merkleRoot}>merkleRoot: <span className="font-mono">{formatLongValue(auditSnapshot.merkleRoot)}</span></span>
                  <span>declared mode check: {auditSnapshot.checks.rootMatchesDeclaredMode ? "passed" : "failed"}</span>
                </div>
              </div>

              {evidencePackage && (
                <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-lg font-bold">Evidence Package Review</div>
                      <p className="mt-1 text-emerald-900">
                        Structured review of the imported public package. It separates on-chain Results audit data,
                        frontend-local registration evidence, Poseidon registry preview, root/mode checks, and warnings.
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${
                        packageVerdict === "Invalid package"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : packageVerdict === "Valid with warnings"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-emerald-200 bg-white text-emerald-700"
                      }`}
                    >
                      {packageVerdict}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Package</p>
                      <p className="mt-1 font-mono text-xs">version {evidencePackage.packageVersion}</p>
                      <p className="mt-1 text-xs text-emerald-800">{new Date(evidencePackage.generatedAt).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Election</p>
                      <p className="mt-1 font-semibold">{evidencePackage.electionId}</p>
                      <p className="mt-1 text-xs text-emerald-800">{evidencePackage.network} / chain {evidencePackage.chainId}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Contract</p>
                      <p className="mt-1 break-all font-mono text-xs">{evidencePackage.contractAddress}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Mode / Root</p>
                      <p className="mt-1 font-mono text-xs">{evidencePackage.demoMode}</p>
                      <p className="mt-1 break-all font-mono text-xs" title={evidencePackage.merkleRoot}>{formatLongValue(evidencePackage.merkleRoot)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div className="font-semibold text-slate-900">On-chain Results Audit</div>
                      <dl className="mt-3 space-y-2">
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Total votes</dt><dd className="font-semibold">{evidencePackage.resultsAudit.totalVotes.toLocaleString()}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Latest block</dt><dd className="font-semibold">{evidencePackage.resultsAudit.latestBlock.toLocaleString()}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Election state</dt><dd className="font-semibold">{evidencePackage.resultsAudit.electionStateName}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Candidate sum check</dt><dd className={evidencePackage.resultsAudit.checks.totalMatchesCandidateSum ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>{String(evidencePackage.resultsAudit.checks.totalMatchesCandidateSum)}</dd></div>
                      </dl>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div className="font-semibold text-slate-900">Registration Evidence</div>
                      <p className="mt-1 text-xs text-slate-500">Frontend-local demo metadata, not an on-chain voter registry.</p>
                      <dl className="mt-3 space-y-2">
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Total</dt><dd className="font-semibold">{evidencePackage.registrationEvidence.totalRegistrations.toLocaleString()}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Pending</dt><dd className="font-semibold">{evidencePackage.registrationEvidence.pendingCount.toLocaleString()}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Approved</dt><dd className="font-semibold">{evidencePackage.registrationEvidence.approvedCount.toLocaleString()}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Rejected</dt><dd className="font-semibold">{evidencePackage.registrationEvidence.rejectedCount.toLocaleString()}</dd></div>
                      </dl>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div className="font-semibold text-slate-900">Registry Preview</div>
                      <dl className="mt-3 space-y-2">
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Hash function</dt><dd className="font-semibold">{evidencePackage.registryPreview.hashFunction}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Depth / capacity</dt><dd className="font-semibold">{evidencePackage.registryPreview.treeDepth} / {evidencePackage.registryPreview.capacity}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Compatible leaves</dt><dd className="font-semibold">{evidencePackage.registryPreview.compatibleLeafCount.toLocaleString()}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Incompatible leaves</dt><dd className="font-semibold">{evidencePackage.registryPreview.incompatibleLeafCount.toLocaleString()}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Overflow</dt><dd className={evidencePackage.registryPreview.overflow ? "font-semibold text-red-700" : "font-semibold text-emerald-700"}>{String(evidencePackage.registryPreview.overflow)}</dd></div>
                      </dl>
                      <p className="mt-3 break-all font-mono text-xs text-slate-600" title={evidencePackage.registryPreview.merkleRootPreview}>
                        merkleRootPreview: {formatLongValue(evidencePackage.registryPreview.merkleRootPreview)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div className="font-semibold text-slate-900">Root Alignment</div>
                      <p className="mt-1 text-xs text-slate-500">{demoModeExplanation(evidencePackage.demoMode)}</p>
                      <dl className="mt-3 space-y-2">
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Package root</dt><dd className="font-mono text-xs" title={evidencePackage.merkleRoot}>{formatLongValue(evidencePackage.merkleRoot)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Static fixture match</dt><dd className={evidencePackage.checks.staticFixtureRootMatchesResultsRoot ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{String(evidencePackage.checks.staticFixtureRootMatchesResultsRoot)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Registry preview match</dt><dd className={evidencePackage.checks.registryPreviewRootMatchesResultsRoot ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{String(evidencePackage.checks.registryPreviewRootMatchesResultsRoot)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-slate-500">Public fields only</dt><dd className={evidencePackage.checks.hasOnlyPublicFields ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>{String(evidencePackage.checks.hasOnlyPublicFields)}</dd></div>
                      </dl>
                    </div>
                  </div>

                  {packageValidation && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div className="font-semibold text-slate-900">Final Auditor Verdict</div>
                      <p className="mt-1 text-sm font-semibold">{packageVerdict}</p>
                      {packageValidation.errors.length > 0 && (
                        <ul className="mt-3 space-y-2 text-red-700">
                          {packageValidation.errors.map((error) => (
                            <li key={error} className="flex items-start gap-2">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <ul className="mt-3 space-y-2 text-slate-600">
                        {uniqueStrings([
                          ...packageValidation.warnings,
                          "This package is public demo evidence only, not a cryptographic proof of per-vote provenance.",
                        ]).map((warning) => (
                          <li key={warning} className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      onClick={() => void handleCopyReviewReport()}
                      disabled={!packageReviewReport}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Clipboard className="h-4 w-4" />
                      Copy normalized review report
                    </button>
                    <button
                      onClick={handleDownloadReviewReport}
                      disabled={!packageReviewReport}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      Download normalized review report
                    </button>
                    {reviewReportMessage && <span className="text-sm text-emerald-900">{reviewReportMessage}</span>}
                  </div>
                </section>
              )}

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <div className="font-semibold text-slate-900">Checks</div>
                  <dl className="mt-3 space-y-2">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Candidate sum</dt>
                      <dd className="font-semibold text-slate-900">{formatValue(candidateSum)} / {formatValue(auditSnapshot.totalVotes)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">totalMatchesCandidateSum</dt>
                      <dd className={auditSnapshot.checks.totalMatchesCandidateSum ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                        {String(auditSnapshot.checks.totalMatchesCandidateSum)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">hasOnChainSource</dt>
                      <dd className={auditSnapshot.checks.hasOnChainSource ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                        {String(auditSnapshot.checks.hasOnChainSource)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">hasLiveLifecycle</dt>
                      <dd className={auditSnapshot.checks.hasLiveLifecycle ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                        {String(auditSnapshot.checks.hasLiveLifecycle)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">hasMerkleRoot</dt>
                      <dd className={auditSnapshot.checks.hasMerkleRoot ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                        {String(auditSnapshot.checks.hasMerkleRoot)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">hasKnownDemoMode</dt>
                      <dd className={auditSnapshot.checks.hasKnownDemoMode ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                        {String(auditSnapshot.checks.hasKnownDemoMode)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">rootMatchesDeclaredMode</dt>
                      <dd className={auditSnapshot.checks.rootMatchesDeclaredMode ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                        {String(auditSnapshot.checks.rootMatchesDeclaredMode)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <div className="font-semibold text-slate-900">Warnings and Errors</div>
                  {validation && validation.errors.length > 0 && (
                    <ul className="mt-3 space-y-2 text-red-700">
                      {validation.errors.map((error) => (
                        <li key={error} className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {packageValidation && packageValidation.errors.length > 0 && (
                    <ul className="mt-3 space-y-2 text-red-700">
                      {packageValidation.errors.map((error) => (
                        <li key={error} className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {validation && validation.warnings.length > 0 && (
                    <ul className="mt-3 space-y-2 text-slate-600">
                      {validation.warnings.map((warning) => (
                        <li key={warning} className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {packageValidation && packageValidation.warnings.length > 0 && (
                    <ul className="mt-3 space-y-2 text-slate-600">
                      {packageValidation.warnings.map((warning) => (
                        <li key={warning} className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900">
                  Candidate Tally Table
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Candidate ID</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Votes</th>
                        <th className="px-4 py-3">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {auditSnapshot.candidateTallies.map((candidate) => (
                        <tr key={candidate.candidateId}>
                          <td className="px-4 py-3 font-mono">{candidate.candidateId}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{candidate.name}</td>
                          <td className="px-4 py-3">{candidate.votes.toLocaleString()}</td>
                          <td className="px-4 py-3">{candidate.sharePercent.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Validate a Results audit JSON to see election metadata, checks, warnings, and candidate tallies.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Live Comparison</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Optionally compare this audit JSON with current localhost contract reads. This reads tallies, Merkle root,
                and demo mode only; it does not write to the contract.
              </p>
            </div>
            <button
              onClick={handleLiveComparison}
              disabled={!auditSnapshot || !importIsValid || comparisonStatus === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {comparisonStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Compare with current on-chain tallies
            </button>
          </div>

          {comparisonError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{comparisonError}</span>
            </div>
          )}

          {comparisonRows.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Field</th>
                      <th className="px-4 py-3">Audit JSON</th>
                      <th className="px-4 py-3">Current on-chain</th>
                      <th className="px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {comparisonRows.map((row) => (
                      <tr key={row.label}>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.auditValue}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.currentValue}</td>
                        <td className={row.matches ? "px-4 py-3 font-semibold text-emerald-700" : "px-4 py-3 font-semibold text-red-700"}>
                          {row.matches ? "Matched" : "Mismatched"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Live comparison depends on MetaMask and the localhost contract being available.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
