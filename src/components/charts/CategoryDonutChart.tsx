import { useMemo, useState } from 'react';
import { getCategoryColor } from '../../constants/categories';
import { formatTHB } from '../../lib/formatters';
import type { TransactionRecord, TransactionType } from '../../types/finance';

interface CategoryDonutChartProps {
  transactions: TransactionRecord[];
  selectedMonth: string;
}

export function CategoryDonutChart({ transactions, selectedMonth }: CategoryDonutChartProps) {
  const [activeType, setActiveType] = useState<TransactionType>('expense');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const { items, total } = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    let sum = 0;
    for (const tx of transactions) {
      if (tx.monthKey !== selectedMonth || tx.type !== activeType) continue;
      sum += tx.amount;
      const existing = map.get(tx.category) || { amount: 0, count: 0 };
      map.set(tx.category, {
        amount: existing.amount + tx.amount,
        count: existing.count + 1,
      });
    }

    const sorted = Array.from(map.entries())
      .map(([category, info]) => ({
        category,
        amount: info.amount,
        count: info.count,
        percent: sum > 0 ? (info.amount / sum) * 100 : 0,
        color: getCategoryColor(category, activeType),
      }))
      .sort((a, b) => b.amount - a.amount);

    return { items: sorted, total: sum };
  }, [transactions, selectedMonth, activeType]);

  const radius = 64;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    let offset = 0;
    return items.map((item) => {
      const dashLen = total > 0 ? (item.amount / total) * circumference : 0;
      const seg = {
        ...item,
        dashArray: `${Math.max(0, dashLen - 1.5)} ${circumference}`,
        dashOffset: -offset,
      };
      offset += dashLen;
      return seg;
    });
  }, [items, total, circumference]);

  const activeItem = items.find((i) => i.category === hoveredCategory) || null;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">สัดส่วนตามหมวดหมู่</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            แยกตามหมวดหมู่ในเดือนที่เลือก
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setActiveType('expense');
              setHoveredCategory(null);
            }}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeType === 'expense'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            รายจ่าย
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveType('income');
              setHoveredCategory(null);
            }}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeType === 'income'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            รายรับ
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-slate-700 mb-1">
            ยังไม่มีข้อมูล{activeType === 'expense' ? 'รายจ่าย' : 'รายรับ'}ในเดือนนี้
          </p>
          <p className="text-xs text-slate-500">
            เมื่อบันทึกรายการแล้ว ระบบจะแสดงสัดส่วนหมวดหมู่ให้อัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-12 gap-6 items-center flex-1">
          <div className="sm:col-span-5 flex items-center justify-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth={strokeWidth}
                />
                {segments.map((seg) => {
                  const isDimmed = hoveredCategory !== null && hoveredCategory !== seg.category;
                  return (
                    <circle
                      key={seg.category}
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={hoveredCategory === seg.category ? strokeWidth + 3 : strokeWidth}
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      opacity={isDimmed ? 0.35 : 1}
                      className="transition-all duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredCategory(seg.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 pointer-events-none">
                <span className="text-[11px] text-slate-500 truncate max-w-[110px]">
                  {activeItem
                    ? activeItem.category
                    : activeType === 'expense'
                      ? 'รายจ่ายรวม'
                      : 'รายรับรวม'}
                </span>
                <span className="text-sm font-bold font-mono-tabular text-slate-900 mt-0.5">
                  {formatTHB(activeItem ? activeItem.amount : total)}
                </span>
                {activeItem && (
                  <span className="text-[11px] font-mono-tabular text-slate-500">
                    {activeItem.percent.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="sm:col-span-7 space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {items.map((item) => {
              const isHighlighted = hoveredCategory === item.category;
              return (
                <div
                  key={item.category}
                  onMouseEnter={() => setHoveredCategory(item.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`p-2 rounded-lg transition-colors cursor-default ${
                    isHighlighted ? 'bg-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-slate-800 truncate">{item.category}</span>
                      <span className="text-slate-400 shrink-0">· {item.count} รายการ</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono-tabular shrink-0">
                      <span className="font-semibold text-slate-900">{formatTHB(item.amount)}</span>
                      <span className="text-slate-500 w-11 text-right">
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${Math.max(2, item.percent)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
