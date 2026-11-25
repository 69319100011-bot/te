import { useMemo, useState } from 'react';
import { formatCompactTHB, formatTHB, formatThaiMonthShort, getRecentMonthKeys } from '../../lib/formatters';
import type { TransactionRecord } from '../../types/finance';

interface MonthlyComparisonChartProps {
  transactions: TransactionRecord[];
  selectedMonth: string;
  onSelectMonth: (monthKey: string) => void;
}

export function MonthlyComparisonChart({
  transactions,
  selectedMonth,
  onSelectMonth,
}: MonthlyComparisonChartProps) {
  const [rangeMonths, setRangeMonths] = useState<6 | 12>(6);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const monthBuckets = useMemo(() => {
    const keys = getRecentMonthKeys(selectedMonth, rangeMonths);
    const map = new Map<string, { income: number; expense: number }>();
    for (const k of keys) {
      map.set(k, { income: 0, expense: 0 });
    }
    for (const tx of transactions) {
      const bucket = map.get(tx.monthKey);
      if (!bucket) continue;
      if (tx.type === 'income') {
        bucket.income += tx.amount;
      } else {
        bucket.expense += tx.amount;
      }
    }
    return keys.map((monthKey) => {
      const data = map.get(monthKey) || { income: 0, expense: 0 };
      return {
        monthKey,
        label: formatThaiMonthShort(monthKey),
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      };
    });
  }, [transactions, selectedMonth, rangeMonths]);

  const maxVal = useMemo(() => {
    let max = 10000;
    for (const b of monthBuckets) {
      if (b.income > max) max = b.income;
      if (b.expense > max) max = b.expense;
    }
    return Math.ceil(max / 5000) * 5000;
  }, [monthBuckets]);

  const svgWidth = 680;
  const svgHeight = 260;
  const padLeft = 64;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 38;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const groupW = chartW / monthBuckets.length;
  const barW = rangeMonths === 6 ? Math.min(24, groupW * 0.28) : Math.min(14, groupW * 0.28);

  const gridTicks = [0, 0.25, 0.5, 0.75, 1];
  const hoveredBucket = hoveredIdx !== null ? monthBuckets[hoveredIdx] : null;

  const netLinePoints = monthBuckets
    .map((b, idx) => {
      const cx = padLeft + idx * groupW + groupW / 2;
      const clampedNet = Math.max(0, Math.min(maxVal, b.net));
      const cy = padTop + chartH - (clampedNet / maxVal) * chartH;
      return `${cx},${cy}`;
    })
    .join(' ');

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            กราฟเปรียบเทียบรายรับ-รายจ่ายรายเดือน
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            คลิกที่แท่งกราฟเพื่อสลับดูสรุปของเดือนนั้น
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
              รายรับ
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
              รายจ่าย
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-900 inline-block" />
              คงเหลือบวก
            </span>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setRangeMonths(6)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                rangeMonths === 6
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 เดือน
            </button>
            <button
              type="button"
              onClick={() => setRangeMonths(12)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                rangeMonths === 12
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              12 เดือน
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip Summary Strip */}
      <div className="min-h-9 mb-3 px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {hoveredBucket ? (
          <>
            <span className="font-semibold text-slate-900">{hoveredBucket.label}</span>
            <div className="flex flex-wrap items-center gap-4 font-mono-tabular">
              <span className="text-emerald-700">รายรับ +{formatTHB(hoveredBucket.income)}</span>
              <span className="text-rose-700">รายจ่าย -{formatTHB(hoveredBucket.expense)}</span>
              <span className={hoveredBucket.net >= 0 ? 'text-slate-900 font-semibold' : 'text-rose-700 font-semibold'}>
                สุทธิ {hoveredBucket.net >= 0 ? '+' : ''}
                {formatTHB(hoveredBucket.net)}
              </span>
            </div>
          </>
        ) : (
          <span className="text-slate-500">
            เลื่อนเมาส์เหนือแท่งกราฟเพื่อดูตัวเลขละเอียด หรือคลิกเลือกเดือนที่ต้องการวิเคราะห์
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[520px] h-64 select-none"
          role="img"
          aria-label="กราฟแท่งเปรียบเทียบรายรับและรายจ่ายรายเดือน"
        >
          {/* Horizontal grid lines */}
          {gridTicks.map((ratio) => {
            const y = padTop + chartH - ratio * chartH;
            const val = maxVal * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={ratio === 0 ? '#CBD5E1' : '#F1F5F9'}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  className="font-mono-tabular"
                  fill="#64748B"
                >
                  {formatCompactTHB(val)}
                </text>
              </g>
            );
          })}

          {/* Month Bars */}
          {monthBuckets.map((bucket, idx) => {
            const groupStart = padLeft + idx * groupW;
            const centerX = groupStart + groupW / 2;
            const incH = (bucket.income / maxVal) * chartH;
            const expH = (bucket.expense / maxVal) * chartH;
            const isSelected = bucket.monthKey === selectedMonth;
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={bucket.monthKey}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectMonth(bucket.monthKey)}
              >
                {/* Hover/Selected subtle backdrop */}
                <rect
                  x={groupStart + 4}
                  y={padTop}
                  width={groupW - 8}
                  height={chartH}
                  rx="6"
                  fill={isSelected ? '#F1F5F9' : isHovered ? '#F8FAFC' : 'transparent'}
                />
                {/* Income Bar */}
                <rect
                  x={centerX - barW - 2}
                  y={padTop + chartH - incH}
                  width={barW}
                  height={Math.max(2, incH)}
                  rx="3"
                  fill={isSelected || isHovered ? '#059669' : '#10B981'}
                  opacity={bucket.income === 0 ? 0.25 : 1}
                />
                {/* Expense Bar */}
                <rect
                  x={centerX + 2}
                  y={padTop + chartH - expH}
                  width={barW}
                  height={Math.max(2, expH)}
                  rx="3"
                  fill={isSelected || isHovered ? '#DC2626' : '#F43F5E'}
                  opacity={bucket.expense === 0 ? 0.25 : 1}
                />
                {/* Month X-axis label */}
                <text
                  x={centerX}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isSelected ? '600' : '400'}
                  fill={isSelected ? '#0F172A' : '#64748B'}
                >
                  {bucket.label}
                </text>
              </g>
            );
          })}

          {/* Net Positive Line Overlay */}
          {monthBuckets.length > 1 && (
            <polyline
              fill="none"
              stroke="#0F172A"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={netLinePoints}
              className="pointer-events-none"
            />
          )}
          {monthBuckets.map((b, idx) => {
            const cx = padLeft + idx * groupW + groupW / 2;
            const clampedNet = Math.max(0, Math.min(maxVal, b.net));
            const cy = padTop + chartH - (clampedNet / maxVal) * chartH;
            return (
              <circle
                key={`pt-${b.monthKey}`}
                cx={cx}
                cy={cy}
                r={hoveredIdx === idx || b.monthKey === selectedMonth ? 4 : 2.5}
                fill="#FFFFFF"
                stroke="#0F172A"
                strokeWidth="1.75"
                className="pointer-events-none"
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}
