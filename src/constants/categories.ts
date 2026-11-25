import type { TransactionType } from '../types/finance';

export interface CategoryOption {
  name: string;
  color: string;
}

export const INCOME_CATEGORIES: CategoryOption[] = [
  { name: 'เงินเดือน', color: '#059669' },
  { name: 'ฟรีแลนซ์ / งานเสริม', color: '#0D9488' },
  { name: 'โบนัส / ค่าคอมมิชชัน', color: '#16A34A' },
  { name: 'ลงทุน / เงินปันผล', color: '#2563EB' },
  { name: 'ขายสินค้า', color: '#0284C7' },
  { name: 'รายรับอื่นๆ', color: '#475569' },
];

export const EXPENSE_CATEGORIES: CategoryOption[] = [
  { name: 'อาหารและเครื่องดื่ม', color: '#DC2626' },
  { name: 'ที่อยู่อาศัย / ค่าเช่า', color: '#EA580C' },
  { name: 'เดินทาง / น้ำมัน', color: '#D97706' },
  { name: 'ค่าน้ำ / ค่าไฟ / เน็ต', color: '#CA8A04' },
  { name: 'ช้อปปิ้ง / ของใช้', color: '#E11D48' },
  { name: 'สุขภาพ / การแพทย์', color: '#0891B2' },
  { name: 'การศึกษา / พัฒนาตัวเอง', color: '#2563EB' },
  { name: 'บันเทิง / สมาชิกรายเดือน', color: '#7C3AED' },
  { name: 'ออมเงิน / ลงทุน', color: '#0D9488' },
  { name: 'รายจ่ายอื่นๆ', color: '#64748B' },
];

export const PAYMENT_METHODS: string[] = [
  'โอนผ่านธนาคาร',
  'พร้อมเพย์',
  'เงินสด',
  'บัตรเครดิต',
  'บัตรเดบิต / วอลเล็ต',
];

export function getCategoriesByType(type: TransactionType): CategoryOption[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getCategoryColor(category: string, type: TransactionType): string {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const found = list.find((c) => c.name === category);
  if (found) return found.color;
  return type === 'income' ? '#16A34A' : '#64748B';
}
