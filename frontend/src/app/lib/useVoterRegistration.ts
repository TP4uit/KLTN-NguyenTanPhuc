import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./authContext";
import { getLocalRegistryFixtureIdentity } from "./browserProof";
import { generateDemoIdentitySecret } from "./demoIdentity";
import {
  createPendingRegistration,
  currentElectionId,
  getIdentitySecret,
  getRegistrationForCurrentUser,
  saveIdentitySecret,
} from "./localVoterRegistration";
import { derivePoseidonIdentityCommitment } from "./poseidonIdentity";
import type {
  CommitmentScheme,
  LocalIdentitySecret,
  VoterRegistration,
  VoterRegistrationStatus,
} from "./voterRegistrationModel";

export type UseVoterRegistrationResult = {
  registration: VoterRegistration | null;
  status: VoterRegistrationStatus;
  identitySecret: LocalIdentitySecret | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  createRegistration: () => Promise<VoterRegistration | null>;
};

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
}

function isSeededFixtureVoter(user: { id: string; email: string }) {
  return user.id === "demo-voter" || user.email.trim().toLowerCase() === "voter@zkvote.local";
}

export function useVoterRegistration(electionId = currentElectionId): UseVoterRegistrationResult {
  const { user } = useAuth();
  const [registration, setRegistration] = useState<VoterRegistration | null>(null);
  const [identitySecret, setIdentitySecret] = useState<LocalIdentitySecret | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedElectionId = useMemo(() => electionId.trim(), [electionId]);

  const refresh = useCallback(() => {
    if (!user) {
      setRegistration(null);
      setIdentitySecret(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setRegistration(getRegistrationForCurrentUser(normalizedElectionId, user.id));
      setIdentitySecret(getIdentitySecret(user.id, normalizedElectionId));
    } catch (refreshError) {
      setRegistration(null);
      setIdentitySecret(null);
      setError(getErrorMessage(refreshError, "Unable to load voter registration state."));
    } finally {
      setIsLoading(false);
    }
  }, [normalizedElectionId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createRegistration = useCallback(async () => {
    if (!user) {
      setRegistration(null);
      setIdentitySecret(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fixtureIdentity = getLocalRegistryFixtureIdentity();
      const usesLocalFixture = isSeededFixtureVoter(user);
      const secret = usesLocalFixture ? fixtureIdentity.selectedVoterSecret : generateDemoIdentitySecret();
      const identityCommitment = usesLocalFixture
        ? fixtureIdentity.selectedIdentityCommitment
        : await derivePoseidonIdentityCommitment(secret);
      const commitmentScheme: CommitmentScheme = usesLocalFixture ? "FIXTURE_POSEIDON" : "POSEIDON";
      const nextIdentitySecret = saveIdentitySecret(user.id, normalizedElectionId, secret);
      const nextRegistration = createPendingRegistration({
        userId: user.id,
        electionId: normalizedElectionId,
        identityCommitment,
        commitmentScheme,
      });

      setIdentitySecret(nextIdentitySecret);
      setRegistration(nextRegistration);

      return nextRegistration;
    } catch (createError) {
      setError(getErrorMessage(createError, "Unable to create voter registration."));
      refresh();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [normalizedElectionId, refresh, user]);

  return {
    registration,
    status: registration?.status ?? "NOT_REGISTERED",
    identitySecret,
    isLoading,
    error,
    refresh,
    createRegistration,
  };
}
