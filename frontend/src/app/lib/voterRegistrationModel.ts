export type VoterRegistrationStatus = "NOT_REGISTERED" | "PENDING" | "APPROVED" | "REJECTED";
export type CommitmentScheme = "POSEIDON" | "SHA256_DEMO" | "FIXTURE_POSEIDON";

export type VoterRegistration = {
  id: string;
  userId: string;
  electionId: string;
  status: VoterRegistrationStatus;
  identityCommitment: string;
  commitmentScheme?: CommitmentScheme;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
};

export type LocalIdentitySecret = {
  userId: string;
  electionId: string;
  secret: string;
  createdAt: string;
};

export type CreatePendingRegistrationInput = {
  userId: string;
  identityCommitment: string;
  commitmentScheme: CommitmentScheme;
  electionId?: string;
};

export type ApprovedCommitmentEvidence = {
  registrationId: string;
  identityCommitment: string;
  commitmentScheme: CommitmentScheme;
  approvedAt: string;
  reviewedAt: string;
};

export type RegistrationEvidence = {
  electionId: string;
  generatedAt: string;
  totalRegistrations: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  approvedCommitments: ApprovedCommitmentEvidence[];
};
