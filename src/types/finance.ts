import type { Timestamp } from 'firebase/firestore';

export type TransactionType = 'income' | 'expense';

export interface UserLedger {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  currency: 'THB';
  defaultMonthlyBudget: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  title: string;
  note: string;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  paymentMethod: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  title: string;
  note: string;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
}

export interface MonthlyBudgetRecord {
  id: string; // monthKey (YYYY-MM)
  userId: string;
  monthKey: string;
  limitAmount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ActiveView = 'overview' | 'analytics' | 'ledger' | 'budget';
