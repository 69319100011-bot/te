import { useMemo } from 'react';
import { formatTHB, formatThaiMonthFull, getRecentMonthKeys } from '../lib/formatters';
import type { MonthlyBudgetRecord, TransactionRecord } from '../types/finance';

interface MonthlySummaryTableProps {
  transactions: TransactionRecord[];
  budgets: Record<string, MonthlyBudgetRecord>;
  defaultBudget: number;
  selectedMonth: string;
  onSelectMonth: (monthKey: string) => void;
}

export function MonthlySummaryTable({
  transactions,
  budgets,
  defaultBudget,
  selectedMonth,
  onSelectMonth,
}: MonthlySummaryTableProps) {
  const rows = useMemo(() => {
    const keys = getRecentMonthKeys(selectedMonth, 12).reverse();
    const map = new Map<string, { income: number; expense: number; count: number }>();
    for (const k of keys) {
      map.set(k, { income: 0, expense: 0, count: 0 });
    }
    for (const tx of transactions) {
      const bucket = map.get(tx.monthKey);
      if (!bucket) continue;
      bucket.count += 1;
      if (tx.type === 'income') bucket.income += tx.amount;
      else bucket.expense += tx.amount;
    }

    return keys.map((monthKey) => {
      const d = map.get(monthKey) || { income: 0, expense: 0, count: 0 };
      const net = d.income - d.expense;
      const savingsRate = d.income > 0 ? (net / d.income) * 100 : 0;
      const budgetLimit = budgets[monthKey]?.limitAmount ?? defaultBudget;
      const budgetPercent = budgetLimit > 0 ? (d.expense / budgetLimit) * 100 : 0;
      return {
        monthKey,
        label: formatThaiMonthFull(monthKey),
        income: d.income,
        expense: d.expense,
        net,
        count: d.count,
        savingsRate,
        budgetLimit,
        budgetPercent,
      };
    });
  }, [transactions, budgets, defaultBudget, selectedMonth]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            ตารางสรุปผลรายรับ-รายจ่ายย้อนหลัง 12 เดือน
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            คลิกที่แถวเดือนใดก็ได้เพื่อสลับดูรายการและกราฟของเดือนนั้น
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
              <th className="py-2.5 px-5 whitespace-nowrap">เดือน</th>
              <th className="py-2.5 px-4 text-right whitespace-nowrap">จำนวนรายการ</th>
              <th className="py-2.5 px-4 text-right whitespace-nowrap">รายรับรวม</th>
              <th className="py-2.5 px-4 text-right whitespace-nowrap">รายจ่ายรวม</th>
              <th className="py-2.5 px-4 text-right whitespace-nowrap">คงเหลือสุทธิ</th>
              <th className="py-2.5 px-4 text-right whitespace-nowrap">อัตราการออม</th>
              <th className="py-2.5 px-5 text-right whitespace-nowrap">การใช้งบประมาณ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {rows.map((row) => {
              const isSelected = row.monthKey === selectedMonth;
              return (
                <tr
                  key={row.monthKey}
                  onClick={() => onSelectMonth(row.monthKey)}
                  className={`h-11 cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-100/80 font-medium' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2.5 px-5 text-slate-900 whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-600">
                    {row.count}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono-tabular text-emerald-700">
                    +{formatTHB(row.income)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono-tabular text-rose-700">
                    -{formatTHB(row.expense)}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-mono-tabular font-semibold ${
                      row.net >= 0 ? 'text-slate-900' : 'text-rose-700'
                    }`}
                  >
                    {row.net >= 0 ? '+' : ''}
                    {formatTHB(row.net)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-700">
                    {row.income > 0 ? `${row.savingsRate.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-5 text-right font-mono-tabular whitespace-nowrap">
                    {row.budgetLimit > 0 ? (
                      <span
                        className={
                          row.budgetPercent > 100
                            ? 'text-rose-700 font-semibold'
                            : row.budgetPercent >= 85
                              ? 'text-amber-700 font-medium'
                              : 'text-slate-600'
                        }
                      >
                        {row.budgetPercent.toFixed(0)}% ของ {formatTHB(row.budgetLimit)}
                      </span>
                    ) : (
                      <span className="text-slate-400">ไม่จำกัด</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
