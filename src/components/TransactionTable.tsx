import { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { exportTransactionsToCsv, formatTHB, formatThaiDate, formatThaiMonthFull } from '../lib/formatters';
import type { TransactionRecord, TransactionType } from '../types/finance';

interface TransactionTableProps {
  transactions: TransactionRecord[];
  selectedMonth: string;
  showAllMonths?: boolean;
  onEdit: (tx: TransactionRecord) => void;
  onDelete: (txId: string) => Promise<void>;
  onAddNew: () => void;
}

export function TransactionTable({
  transactions,
  selectedMonth,
  showAllMonths = false,
  onEdit,
  onDelete,
  onAddNew,
}: TransactionTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allCategoryNames = useMemo(() => {
    const names = new Set<string>();
    INCOME_CATEGORIES.forEach((c) => names.add(c.name));
    EXPENSE_CATEGORIES.forEach((c) => names.add(c.name));
    transactions.forEach((t) => names.add(t.category));
    return Array.from(names);
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (!showAllMonths && tx.monthKey !== selectedMonth) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
      if (q) {
        const hay = `${tx.title} ${tx.category} ${tx.note} ${tx.paymentMethod}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, selectedMonth, showAllMonths, typeFilter, categoryFilter, searchQuery]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {showAllMonths
                ? 'รายการรายรับ-รายจ่ายทั้งหมด'
                : `รายการเคลื่อนไหว — ${formatThaiMonthFull(selectedMonth)}`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
              แสดง {filtered.length} รายการ · รายรับ +{formatTHB(totals.income)} · รายจ่าย -{formatTHB(totals.expense)}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  exportTransactionsToCsv(
                    filtered,
                    `klangngoen-${showAllMonths ? 'all' : selectedMonth}.csv`
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                ส่งออก CSV
              </button>
            )}
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มรายการ
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อรายการ หมวดหมู่ หรือหมายเหตุ..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'income', 'expense'] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setTypeFilter(val)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  typeFilter === val
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {val === 'all' ? 'ทั้งหมด' : val === 'income' ? 'รายรับ' : 'รายจ่าย'}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="กรองตามหมวดหมู่"
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900"
          >
            <option value="all">ทุกหมวดหมู่</option>
            {allCategoryNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-14 px-6 text-center">
          <p className="text-sm font-medium text-slate-800 mb-1">
            ไม่พบรายการที่ตรงกับเงื่อนไข
          </p>
          <p className="text-xs text-slate-500 mb-5">
            ลองเปลี่ยนคำค้นหา เดือนที่เลือก หรือเพิ่มรายการรายรับ-รายจ่ายใหม่
          </p>
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            บันทึกรายการใหม่
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4 whitespace-nowrap">วันที่</th>
                <th className="py-2.5 px-4">รายการ</th>
                <th className="py-2.5 px-4 whitespace-nowrap">หมวดหมู่</th>
                <th className="py-2.5 px-4 whitespace-nowrap">ช่องทาง</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">จำนวนเงิน</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((tx) => {
                const isConfirming = confirmDeleteId === tx.id;
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/90 transition-colors h-11"
                  >
                    <td className="py-2.5 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                      {formatThaiDate(tx.date)}
                    </td>
                    <td className="py-2.5 px-4 min-w-[200px]">
                      <div className="font-medium text-slate-900">{tx.title}</div>
                      {tx.note && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {tx.note}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      <span>{tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span>{tx.category}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      {tx.paymentMethod}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono-tabular font-semibold whitespace-nowrap ${
                        tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatTHB(tx.amount, true)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      {isConfirming ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deletingId === tx.id}
                            onClick={() => handleConfirmDelete(tx.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-rose-600 rounded hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                          >
                            {deletingId === tx.id ? 'กำลังลบ...' : 'ยืนยันลบ'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(tx)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            aria-label={`แก้ไขรายการ ${tx.title}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(tx.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            aria-label={`ลบรายการ ${tx.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
