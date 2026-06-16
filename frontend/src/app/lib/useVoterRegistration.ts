import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./authContext";
import { deriveDemoIdentityCommitment, generateDemoIdentitySecret } from "./demoIdentity";
import {
  createPendingRegistration,
  currentElectionId,
  getIdentitySecret,
  getRegistrationForCurrentUser,
  saveIdentitySecret,
} from "./localVoterRegistration";
import type {
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
      const secret = generateDemoIdentitySecret();
      const identityCommitment = await deriveDemoIdentityCommitment(secret, normalizedElectionId, user.id);
      const nextIdentitySecret = saveIdentitySecret(user.id, normalizedElectionId, secret);
      const nextRegistration = createPendingRegistration({
        userId: user.id,
        electionId: normalizedElectionId,
        identityCommitment,
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
