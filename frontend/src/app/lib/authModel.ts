export type UserRole = "ADMIN" | "VOTER" | "AUDITOR";

export type DemoUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  password: string;
  walletAddress?: string;
  createdAt: string;
};

export type AuthSession = {
  userId: string;
  createdAt: string;
};

export type RegisterUserInput = {
  fullName: string;
  email: string;
  password: string;
  walletAddress?: string;
};
