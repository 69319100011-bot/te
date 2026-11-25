import type { TransactionRecord } from '../types/finance';

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export function formatTHB(amount: number, showDecimals = false): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(safe);
}

export function formatCompactTHB(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}฿${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}฿${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  }
  return `${sign}฿${Math.round(abs)}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthKey(): string {
  return getTodayDateString().slice(0, 7);
}

export function formatThaiMonthFull(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  if (!Number.isFinite(year) || monthIdx < 0 || monthIdx > 11) {
    return monthKey;
  }
  return `${THAI_MONTHS_FULL[monthIdx]} ${year + 543}`;
}

export function formatThaiMonthShort(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  if (!Number.isFinite(year) || monthIdx < 0 || monthIdx > 11) {
    return monthKey;
  }
  const beShort = String(year + 543).slice(-2);
  return `${THAI_MONTHS_SHORT[monthIdx]} ${beShort}`;
}

export function formatThaiDate(dateStr: string): string {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  const day = Number(dStr);
  if (!Number.isFinite(year) || monthIdx < 0 || monthIdx > 11 || !Number.isFinite(day)) {
    return dateStr;
  }
  const beShort = String(year + 543).slice(-2);
  return `${day} ${THAI_MONTHS_SHORT[monthIdx]} ${beShort}`;
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const date = new Date(Number(yStr), Number(mStr) - 1 + deltaMonths, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getRecentMonthKeys(anchorMonthKey: string, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(shiftMonthKey(anchorMonthKey, -i));
  }
  return keys;
}

export function getDaysInMonth(monthKey: string): number {
  const [yStr, mStr] = monthKey.split('-');
  return new Date(Number(yStr), Number(mStr), 0).getDate();
}

export function exportTransactionsToCsv(transactions: TransactionRecord[], filename: string): void {
  const headers = ['วันที่', 'ประเภท', 'ชื่อรายการ', 'หมวดหมู่', 'ช่องทางชำระเงิน', 'จำนวนเงิน (บาท)', 'หมายเหตุ'];
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = transactions.map((tx) => [
    tx.date,
    tx.type === 'income' ? 'รายรับ' : 'รายจ่าย',
    tx.title,
    tx.category,
    tx.paymentMethod,
    tx.type === 'income' ? tx.amount : -tx.amount,
    tx.note,
  ]);

  const csvContent = '\uFEFF' + [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
