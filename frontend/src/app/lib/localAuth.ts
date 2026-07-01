import type { AuthSession, DemoUser, RegisterUserInput } from "./authModel";

const USERS_KEY = "zkvote.demoAuth.users";
const SESSION_KEY = "zkvote.demoAuth.session";
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_ACCOUNT_PASSWORD = "password123";
const DEMO_ACCOUNT_CREATED_AT = "2026-06-15T00:00:00.000Z";

const SEEDED_USERS: DemoUser[] = [
  {
    id: "demo-admin",
    fullName: "Demo Admin",
    email: "admin@zkvote.local",
    role: "ADMIN",
    password: DEMO_ACCOUNT_PASSWORD,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
  },
  {
    id: "demo-voter",
    fullName: "Demo Voter",
    email: "voter@zkvote.local",
    role: "VOTER",
    password: DEMO_ACCOUNT_PASSWORD,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
  },
  {
    id: "demo-voter-2",
    fullName: "Demo Voter 2",
    email: "voter2@zkvote.local",
    role: "VOTER",
    password: DEMO_ACCOUNT_PASSWORD,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
  },
  {
    id: "demo-voter-3",
    fullName: "Demo Voter 3",
    email: "voter3@zkvote.local",
    role: "VOTER",
    password: DEMO_ACCOUNT_PASSWORD,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
  },
  {
    id: "demo-voter-4",
    fullName: "Demo Voter 4",
    email: "voter4@zkvote.local",
    role: "VOTER",
    password: DEMO_ACCOUNT_PASSWORD,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
  },
  {
    id: "demo-auditor",
    fullName: "Demo Auditor",
    email: "auditor@zkvote.local",
    role: "AUDITOR",
    password: DEMO_ACCOUNT_PASSWORD,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
  },
];

export const DEMO_ACCOUNT_CREDENTIALS = SEEDED_USERS.map(({ email, password }) => ({ email, password }));

function getStorage() {
  if (typeof window === "undefined") {
    throw new Error("Demo auth storage is only available in the browser.");
  }

  try {
    return window.localStorage;
  } catch {
    throw new Error("Browser storage is unavailable. Enable localStorage to use demo accounts.");
  }
}

function readJson<T>(key: string, fallback: T): T {
  const rawValue = getStorage().getItem(key);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    getStorage().removeItem(key);
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  getStorage().setItem(key, JSON.stringify(value));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function validateEmail(email: string) {
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Enter a valid email address.");
  }
}

function validatePassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

function assertUniqueEmail(email: string, users: DemoUser[]) {
  if (users.some((user) => normalizeEmail(user.email) === email)) {
    throw new Error("An account with this email already exists.");
  }
}

function readUsers() {
  return readJson<DemoUser[]>(USERS_KEY, []);
}

function writeUsers(users: DemoUser[]) {
  writeJson(USERS_KEY, users);
}

function readSession() {
  return readJson<AuthSession | null>(SESSION_KEY, null);
}

function createUserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `demo-user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function seedDemoUsers() {
  const users = readUsers();
  const missingSeedUsers = SEEDED_USERS.filter(
    (seedUser) => !users.some((user) => normalizeEmail(user.email) === normalizeEmail(seedUser.email)),
  );

  if (missingSeedUsers.length === 0) {
    return users;
  }

  const nextUsers = [...users, ...missingSeedUsers];
  writeUsers(nextUsers);
  return nextUsers;
}

export function listUsers() {
  return readUsers();
}

export function registerUser(input: RegisterUserInput) {
  const users = readUsers();
  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  const walletAddress = normalizeOptionalText(input.walletAddress);

  if (!fullName) {
    throw new Error("Full name is required.");
  }

  validateEmail(email);
  validatePassword(input.password);
  assertUniqueEmail(email, users);

  const user: DemoUser = {
    id: createUserId(),
    fullName,
    email,
    role: "VOTER",
    password: input.password,
    createdAt: new Date().toISOString(),
    ...(walletAddress ? { walletAddress } : {}),
  };

  const nextUsers = [...users, user];
  writeUsers(nextUsers);
  writeJson<AuthSession>(SESSION_KEY, {
    userId: user.id,
    createdAt: new Date().toISOString(),
  });

  return user;
}

export function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  validateEmail(normalizedEmail);

  const user = readUsers().find(
    (candidate) => normalizeEmail(candidate.email) === normalizedEmail && candidate.password === password,
  );

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  writeJson<AuthSession>(SESSION_KEY, {
    userId: user.id,
    createdAt: new Date().toISOString(),
  });

  return user;
}

export function logoutUser() {
  getStorage().removeItem(SESSION_KEY);
}

export function getCurrentUser() {
  const session = readSession();

  if (!session) {
    return null;
  }

  const user = readUsers().find((candidate) => candidate.id === session.userId);

  if (!user) {
    logoutUser();
    return null;
  }

  return user;
}

export function updateCurrentUserWallet(address: string) {
  const session = readSession();

  if (!session) {
    throw new Error("No user is currently logged in.");
  }

  const walletAddress = normalizeOptionalText(address);

  if (!walletAddress) {
    throw new Error("Wallet address is required.");
  }

  const users = readUsers();
  const userIndex = users.findIndex((user) => user.id === session.userId);

  if (userIndex < 0) {
    logoutUser();
    throw new Error("Current user no longer exists.");
  }

  const nextUser: DemoUser = {
    ...users[userIndex],
    walletAddress,
  };
  const nextUsers = [...users];
  nextUsers[userIndex] = nextUser;
  writeUsers(nextUsers);

  return nextUser;
}
