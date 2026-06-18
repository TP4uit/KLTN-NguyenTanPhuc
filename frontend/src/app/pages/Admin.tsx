import { AlertCircle, CheckCircle2, KeyRound, Loader2, Lock, RefreshCw, Shield, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminRegistryPreview } from "../components/AdminRegistryPreview";
import { AdminVoterRegistrationManager } from "../components/AdminVoterRegistrationManager";
import { DashboardHeader } from "../components/DashboardHeader";
import {
  connectLocalElection,
  formatAccount,
  formatLongValue,
  getConnectedLocalElection,
  getMetadataElectionLifecycle,
  localElection,
  readElectionAdminState,
  type ElectionAdminState,
} from "../lib/localElection";

type AdminStatus = "idle" | "loading" | "pending" | "success" | "error";

export function Admin() {
  const [account, setAccount] = useState<string | null>(null);
  const [adminState, setAdminState] = useState<ElectionAdminState | null>(null);
  const [newRoot, setNewRoot] = useState("");
  const [status, setStatus] = useState<AdminStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Connect MetaMask to manage the local election lifecycle.");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const metadataLifecycle = getMetadataElectionLifecycle();
  const lifecycle = adminState ?? {
    ...metadataLifecycle,
    admin: "Not connected",
    electionId: localElection.electionId,
    merkleRoot: localElection.merkleRoot,
    isAdmin: false,
  };
  const isBusy = status === "loading" || status === "pending";
  const normalizedRoot = newRoot.trim();
  const rootIsNumeric = useMemo(() => /^\d+$/.test(normalizedRoot), [normalizedRoot]);
  const rootIsNonZero = useMemo(() => {
    if (!rootIsNumeric) {
      return false;
    }

    return BigInt(normalizedRoot) > 0n;
  }, [normalizedRoot, rootIsNumeric]);
  const canManage = adminState?.isAdmin === true;
  const canSetRoot = canManage && lifecycle.electionState === 0 && rootIsNonZero && !isBusy;
  const canOpen = canManage && lifecycle.electionState === 0 && !isBusy;
  const canClose = canManage && lifecycle.electionState === 1 && !isBusy;

  const loadExistingConnection = async () => {
    try {
      const connection = await getConnectedLocalElection();

      if (!connection) {
        return;
      }

      const state = await readElectionAdminState(connection.contract, connection.account);
      setAccount(connection.account);
      setAdminState(state);
      setStatus("idle");
      setStatusMessage("Loaded current election lifecycle state.");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to read election state.");
    }
  };

  useEffect(() => {
    void loadExistingConnection();
  }, []);

  const connectAndRefresh = async () => {
    setStatus("loading");
    setLastTxHash(null);

    try {
      const connection = await connectLocalElection();
      const state = await readElectionAdminState(connection.contract, connection.account);
      setAccount(connection.account);
      setAdminState(state);
      setStatus("idle");
      setStatusMessage("Connected and refreshed election state.");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to connect MetaMask.");
    }
  };

  const refreshState = async () => {
    setStatus("loading");
    setLastTxHash(null);

    try {
      const connection = await connectLocalElection();
      const state = await readElectionAdminState(connection.contract, connection.account);
      setAccount(connection.account);
      setAdminState(state);
      setStatus("idle");
      setStatusMessage("Election state refreshed.");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to refresh election state.");
    }
  };

  const runAdminTransaction = async (
    label: string,
    action: (contract: Awaited<ReturnType<typeof connectLocalElection>>["contract"]) => Promise<{ hash: string; wait: () => Promise<{ hash?: string } | null> }>,
  ) => {
    setStatus("pending");
    setStatusMessage(`${label} transaction is pending in MetaMask.`);
    setLastTxHash(null);

    try {
      const connection = await connectLocalElection();
      const before = await readElectionAdminState(connection.contract, connection.account);

      if (!before.isAdmin) {
        throw new Error("Only admin can manage election lifecycle.");
      }

      const tx = await action(connection.contract);
      const receipt = await tx.wait();
      const state = await readElectionAdminState(connection.contract, connection.account);

      setAccount(connection.account);
      setAdminState(state);
      setLastTxHash(receipt?.hash ?? tx.hash);
      setStatus("success");
      setStatusMessage(`${label} confirmed.`);
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : `${label} failed.`);
    }
  };

  const handleSetMerkleRoot = async () => {
    if (!rootIsNumeric) {
      setStatus("error");
      setStatusMessage("Merkle root must be a numeric value.");
      return;
    }

    if (!rootIsNonZero) {
      setStatus("error");
      setStatusMessage("Merkle root must be greater than zero.");
      return;
    }

    await runAdminTransaction("setMerkleRoot", (contract) => contract.setMerkleRoot(normalizedRoot));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Admin Election Control</h1>
            </div>
            <p className="text-lg text-slate-600 max-w-3xl">
              Manage the local election lifecycle and Merkle root for the demo contract.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={connectAndRefresh}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {account ? formatAccount(account) : "Connect MetaMask"}
            </button>
            <button
              onClick={refreshState}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh state
            </button>
          </div>
        </div>

        <div
          className={`mb-8 rounded-2xl border px-4 py-3 text-sm ${
            status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <div className="flex items-start gap-2">
            {status === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : status === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : isBusy ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <div>{statusMessage}</div>
              {lastTxHash && (
                <div className="mt-1 font-mono text-xs">
                  tx: {lastTxHash.slice(0, 12)}...{lastTxHash.slice(-10)}
                </div>
              )}
            </div>
          </div>
        </div>

        {account && !canManage && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Only admin can manage election lifecycle.</span>
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-2">Election State</p>
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  lifecycle.electionState === 1
                    ? "bg-emerald-500"
                    : lifecycle.electionState === 2
                      ? "bg-slate-400"
                      : "bg-amber-500"
                }`}
              />
              <p className="text-2xl font-bold text-slate-900">{lifecycle.electionStateName}</p>
            </div>
            <p className="mt-2 text-xs text-slate-500">Numeric state: {lifecycle.electionState}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-2">Connected Wallet</p>
            <p className="text-lg font-semibold text-slate-900 font-mono break-all">
              {account ?? "Not connected"}
            </p>
            <p className="mt-2 text-xs text-slate-500">{canManage ? "Admin permissions active" : "Read-only access"}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-2">Contract</p>
            <p className="text-lg font-semibold text-slate-900 font-mono break-all">
              {localElection.election.address}
            </p>
            <p className="mt-2 text-xs text-slate-500">Chain ID {localElection.chainId}</p>
          </div>
        </section>

        <AdminVoterRegistrationManager />
        <AdminRegistryPreview />

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Contract State</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-slate-500 mb-1">Admin address</p>
                <p className="font-mono text-slate-900 break-all">{lifecycle.admin}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500 mb-1">Connected wallet is admin</p>
                <p className={canManage ? "font-semibold text-emerald-700" : "font-semibold text-slate-700"}>
                  {canManage ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-500 mb-1">Election ID</p>
                <p className="font-mono text-slate-900">{lifecycle.electionId}</p>
              </div>
              <div>
                <p className="font-medium text-slate-500 mb-1">Merkle root</p>
                <p className="font-mono text-slate-900 break-all">{lifecycle.merkleRoot}</p>
                <p className="mt-1 text-xs text-slate-500">{formatLongValue(lifecycle.merkleRoot)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Lifecycle Actions</h2>
            <div className="space-y-5">
              <div>
                <label htmlFor="merkle-root" className="block text-sm font-medium text-slate-700 mb-2">
                  New Merkle root
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="merkle-root"
                    value={newRoot}
                    onChange={(event) => setNewRoot(event.target.value)}
                    inputMode="numeric"
                    placeholder="Enter non-zero numeric root"
                    disabled={isBusy || lifecycle.electionState !== 0 || !canManage}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-mono text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <button
                    onClick={handleSetMerkleRoot}
                    disabled={!canSetRoot}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Set root
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Available only during Registration and only for the admin wallet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => runAdminTransaction("openElection", (contract) => contract.openElection())}
                  disabled={!canOpen}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Open election
                </button>
                <button
                  onClick={() => runAdminTransaction("closeElection", (contract) => contract.closeElection())}
                  disabled={!canClose}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Close election
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Buttons are disabled unless the connected wallet is the contract admin and the election is in the matching lifecycle state.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
