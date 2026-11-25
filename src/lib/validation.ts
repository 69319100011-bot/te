import type { TransactionInput } from '../types/finance';

// Constraints synchronized verbatim with firebase-blueprint.json
export const BLUEPRINT_LIMITS = {
  UID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  UID_MAX_LENGTH: 128,
  DISPLAY_NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 254,
  PHOTO_URL_MAX_LENGTH: 512,
  CATEGORY_MAX_LENGTH: 50,
  TITLE_MAX_LENGTH: 120,
  NOTE_MAX_LENGTH: 300,
  PAYMENT_METHOD_MAX_LENGTH: 40,
  DATE_PATTERN: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  MONTH_KEY_PATTERN: /^[0-9]{4}-[0-9]{2}$/,
  MAX_AMOUNT: 1000000000,
} as const;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function deriveMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function sanitizeTransactionInput(raw: TransactionInput): {
  sanitized: TransactionInput & { monthKey: string };
  validation: ValidationResult;
} {
  const title = raw.title.trim().slice(0, BLUEPRINT_LIMITS.TITLE_MAX_LENGTH);
  const category = raw.category.trim().slice(0, BLUEPRINT_LIMITS.CATEGORY_MAX_LENGTH);
  const note = raw.note.trim().slice(0, BLUEPRINT_LIMITS.NOTE_MAX_LENGTH);
  const paymentMethod = raw.paymentMethod.trim().slice(0, BLUEPRINT_LIMITS.PAYMENT_METHOD_MAX_LENGTH);
  const date = raw.date.trim();
  const monthKey = deriveMonthKey(date);
  const amount = Math.round(Number(raw.amount) * 100) / 100;
  const type = raw.type === 'income' ? 'income' : 'expense';

  if (!title) {
    return {
      sanitized: { type, amount, category, title, note, date, monthKey, paymentMethod },
      validation: { valid: false, error: 'กรุณาระบุชื่อรายการ' },
    };
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > BLUEPRINT_LIMITS.MAX_AMOUNT) {
    return {
      sanitized: { type, amount, category, title, note, date, monthKey, paymentMethod },
      validation: { valid: false, error: 'กรุณาระบุจำนวนเงินที่มากกว่า 0 และไม่เกิน 1,000,000,000 บาท' },
    };
  }
  if (!category) {
    return {
      sanitized: { type, amount, category, title, note, date, monthKey, paymentMethod },
      validation: { valid: false, error: 'กรุณาเลือกหมวดหมู่' },
    };
  }
  if (!BLUEPRINT_LIMITS.DATE_PATTERN.test(date) || !BLUEPRINT_LIMITS.MONTH_KEY_PATTERN.test(monthKey)) {
    return {
      sanitized: { type, amount, category, title, note, date, monthKey, paymentMethod },
      validation: { valid: false, error: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)' },
    };
  }
  if (!paymentMethod) {
    return {
      sanitized: { type, amount, category, title, note, date, monthKey, paymentMethod },
      validation: { valid: false, error: 'กรุณาเลือกช่องทางชำระเงิน' },
    };
  }

  return {
    sanitized: { type, amount, category, title, note, date, monthKey, paymentMethod },
    validation: { valid: true },
  };
}

export function sanitizeBudgetLimit(rawLimit: number): {
  limitAmount: number;
  validation: ValidationResult;
} {
  const limitAmount = Math.round(Number(rawLimit) * 100) / 100;
  if (!Number.isFinite(limitAmount) || limitAmount < 0 || limitAmount > BLUEPRINT_LIMITS.MAX_AMOUNT) {
    return {
      limitAmount: 0,
      validation: { valid: false, error: 'กรุณาระบุวงเงินงบประมาณตั้งแต่ 0 ถึง 1,000,000,000 บาท' },
    };
  }
  return { limitAmount, validation: { valid: true } };
}
