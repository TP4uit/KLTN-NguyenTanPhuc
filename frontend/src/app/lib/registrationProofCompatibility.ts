import { getLocalRegistryFixtureIdentity } from "./browserProof";
import { localElection } from "./localElection";
import type { VoterRegistration } from "./voterRegistrationModel";

export type RegistrationProofCompatibility = {
  isCompatible: boolean;
  reason: string;
  fixtureIdentityCommitment: string;
  fixtureMerkleRoot: string;
};

export function getRegistrationProofCompatibility(
  registration: VoterRegistration | null,
): RegistrationProofCompatibility {
  const fixtureIdentity = getLocalRegistryFixtureIdentity();
  const fixtureElectionMatchesLocal = fixtureIdentity.selectedElectionId === localElection.electionId;

  if (!registration) {
    return {
      isCompatible: false,
      reason: "No voter registration exists for this election.",
      fixtureIdentityCommitment: fixtureIdentity.selectedIdentityCommitment,
      fixtureMerkleRoot: fixtureIdentity.merkleRoot,
    };
  }

  if (registration.status !== "APPROVED") {
    return {
      isCompatible: false,
      reason: "Registration must be approved before it can use the local proof fixture.",
      fixtureIdentityCommitment: fixtureIdentity.selectedIdentityCommitment,
      fixtureMerkleRoot: fixtureIdentity.merkleRoot,
    };
  }

  if (registration.electionId !== localElection.electionId || registration.electionId !== fixtureIdentity.selectedElectionId) {
    return {
      isCompatible: false,
      reason: "Registration election does not match the local election and static proof fixture.",
      fixtureIdentityCommitment: fixtureIdentity.selectedIdentityCommitment,
      fixtureMerkleRoot: fixtureIdentity.merkleRoot,
    };
  }

  if (registration.identityCommitment !== fixtureIdentity.selectedIdentityCommitment) {
    return {
      isCompatible: false,
      reason: "Approved locally, but this identity is not in the current static ZK registry fixture yet.",
      fixtureIdentityCommitment: fixtureIdentity.selectedIdentityCommitment,
      fixtureMerkleRoot: fixtureIdentity.merkleRoot,
    };
  }

  if (!fixtureElectionMatchesLocal) {
    return {
      isCompatible: false,
      reason: "The local election metadata does not match the static proof fixture election.",
      fixtureIdentityCommitment: fixtureIdentity.selectedIdentityCommitment,
      fixtureMerkleRoot: fixtureIdentity.merkleRoot,
    };
  }

  return {
    isCompatible: true,
    reason: "Proof fixture compatible.",
    fixtureIdentityCommitment: fixtureIdentity.selectedIdentityCommitment,
    fixtureMerkleRoot: fixtureIdentity.merkleRoot,
  };
}

export function isRegistrationCompatibleWithLocalFixture(registration: VoterRegistration | null) {
  return getRegistrationProofCompatibility(registration).isCompatible;
}
