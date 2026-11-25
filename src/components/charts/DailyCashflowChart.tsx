import { useMemo, useState } from 'react';
import { formatCompactTHB, formatTHB, formatThaiMonthFull, getDaysInMonth } from '../../lib/formatters';
import type { TransactionRecord } from '../../types/finance';

interface DailyCashflowChartProps {
  transactions: TransactionRecord[];
  selectedMonth: string;
}

export function DailyCashflowChart({ transactions, selectedMonth }: DailyCashflowChartProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const dailyRows = useMemo(() => {
    const daysCount = getDaysInMonth(selectedMonth);
    const days = Array.from({ length: daysCount }, (_, i) => ({
      day: i + 1,
      income: 0,
      expense: 0,
      cumulativeNet: 0,
    }));

    for (const tx of transactions) {
      if (tx.monthKey !== selectedMonth) continue;
      const dayNum = Number(tx.date.slice(8, 10));
      if (dayNum >= 1 && dayNum <= daysCount) {
        if (tx.type === 'income') {
          days[dayNum - 1].income += tx.amount;
        } else {
          days[dayNum - 1].expense += tx.amount;
        }
      }
    }

    let running = 0;
    for (const d of days) {
      running += d.income - d.expense;
      d.cumulativeNet = running;
    }

    return days;
  }, [transactions, selectedMonth]);

  const maxDaily = useMemo(() => {
    let max = 1000;
    for (const d of dailyRows) {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
    }
    return Math.ceil(max / 1000) * 1000;
  }, [dailyRows]);

  const svgWidth = 680;
  const svgHeight = 220;
  const padLeft = 58;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 32;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const stepW = chartW / dailyRows.length;
  const barW = Math.max(4, Math.min(12, stepW * 0.65));

  const activeDay = hoveredDay !== null ? dailyRows[hoveredDay - 1] : null;
  const hasAnyActivity = dailyRows.some((d) => d.income > 0 || d.expense > 0);

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            กระแสเงินสดรายวัน — {formatThaiMonthFull(selectedMonth)}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            แสดงยอดรายรับและรายจ่ายที่เกิดขึ้นในแต่ละวันของเดือน
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
            รายรับรายวัน
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
            รายจ่ายรายวัน
          </span>
        </div>
      </div>

      <div className="min-h-9 mb-3 px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {activeDay ? (
          <>
            <span className="font-semibold text-slate-900">
              วันที่ {activeDay.day} {formatThaiMonthFull(selectedMonth)}
            </span>
            <div className="flex flex-wrap items-center gap-4 font-mono-tabular">
              <span className="text-emerald-700">รายรับ +{formatTHB(activeDay.income)}</span>
              <span className="text-rose-700">รายจ่าย -{formatTHB(activeDay.expense)}</span>
              <span className="text-slate-900 font-semibold">
                ยอดสะสมถึงวันนี้ {activeDay.cumulativeNet >= 0 ? '+' : ''}
                {formatTHB(activeDay.cumulativeNet)}
              </span>
            </div>
          </>
        ) : (
          <span className="text-slate-500">
            {hasAnyActivity
              ? 'ชี้เมาส์บนแท่งวันที่เพื่อดูรายรับ-รายจ่ายและยอดเงินสะสมของวันนั้น'
              : 'ยังไม่มีรายการเคลื่อนไหวรายวันในเดือนนี้'}
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[520px] h-52 select-none"
          role="img"
          aria-label="กราฟแท่งรายรับและรายจ่ายรายวัน"
        >
          {[0, 0.5, 1].map((ratio) => {
            const y = padTop + chartH - ratio * chartH;
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
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  className="font-mono-tabular"
                  fill="#64748B"
                >
                  {formatCompactTHB(maxDaily * ratio)}
                </text>
              </g>
            );
          })}

          {dailyRows.map((row, idx) => {
            const x = padLeft + idx * stepW;
            const centerX = x + stepW / 2;
            const incH = (row.income / maxDaily) * chartH;
            const expH = (row.expense / maxDaily) * chartH;
            const isHovered = hoveredDay === row.day;
            const showLabel = row.day === 1 || row.day % 5 === 0 || row.day === dailyRows.length;

            return (
              <g
                key={row.day}
                onMouseEnter={() => setHoveredDay(row.day)}
                onMouseLeave={() => setHoveredDay(null)}
                className="cursor-crosshair"
              >
                <rect
                  x={x}
                  y={padTop}
                  width={stepW}
                  height={chartH}
                  fill={isHovered ? '#F1F5F9' : 'transparent'}
                />
                {row.income > 0 && (
                  <rect
                    x={centerX - barW / 2}
                    y={padTop + chartH - incH}
                    width={barW}
                    height={Math.max(2, incH)}
                    rx="2"
                    fill="#059669"
                  />
                )}
                {row.expense > 0 && (
                  <rect
                    x={centerX - barW / 2 + (row.income > 0 ? barW * 0.45 : 0)}
                    y={padTop + chartH - expH}
                    width={row.income > 0 ? Math.max(3, barW * 0.65) : barW}
                    height={Math.max(2, expH)}
                    rx="2"
                    fill="#E11D48"
                  />
                )}
                {showLabel && (
                  <text
                    x={centerX}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fontSize="10"
                    className="font-mono-tabular"
                    fill="#64748B"
                  >
                    {row.day}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
