import type { User } from '@/store/auth';

export interface DemoAccount {
  prn: string;
  rollNo: number;
  name: string;
  password: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { prn: '241107068', rollNo: 241107068, name: 'Aniruddha',     password: 'CampEx@Aniruddha1' },
  { prn: '241107069', rollNo: 241107069, name: 'Chandrashekar', password: 'CampEx@Chandra2'   },
  { prn: '241107070', rollNo: 241107070, name: 'Danish',        password: 'CampEx@Danish3'    },
  { prn: '241107071', rollNo: 241107071, name: 'Manish',        password: 'CampEx@Manish4'    },
  { prn: '241107072', rollNo: 241107072, name: 'Niraj',         password: 'CampEx@Niraj5'     },
] as const;

const STORAGE_KEY = 'cx_demo_user';

export const isDemoPrn = (prn: string): boolean => {
  return DEMO_ACCOUNTS.some((acct) => acct.prn === prn.trim());
};

export const findDemoAccount = (prn: string, password: string): User | null => {
  const match = DEMO_ACCOUNTS.find(
    (acct) => acct.prn === prn.trim() && acct.password === password.trim()
  );

  if (!match) return null;

  return {
    id: `demo-${match.prn}`,
    prn: match.prn,
    rollNo: match.rollNo,
    name: match.name,
    email: `${match.name.toLowerCase()}@college.edu.in`,
    batch: 'DEMO',
    branch: 'ADMIN',
    year: 'FACULTY',
    role: 'ADMIN',
    mustChangePassword: false,
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };
};

export const getStoredDemoUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const setStoredDemoUser = (user: User): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {}
};

export const clearStoredDemoUser = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};
