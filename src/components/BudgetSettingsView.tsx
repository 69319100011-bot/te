import React, { useEffect, useState } from 'react';
import { Check, Database, ShieldCheck } from 'lucide-react';
import { COLLECTION_ROOT, FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../lib/firebase';
import { formatTHB, formatThaiMonthFull } from '../lib/formatters';
import { BLUEPRINT_LIMITS, sanitizeBudgetLimit } from '../lib/validation';
import type { MonthlyBudgetRecord, UserLedger } from '../types/finance';

interface BudgetSettingsViewProps {
  selectedMonth: string;
  monthExpense: number;
  ledger: UserLedger | null;
  monthlyBudget: MonthlyBudgetRecord | undefined;
  onSaveMonthBudget: (monthKey: string, limitAmount: number, exists: boolean) => Promise<void>;
  onSaveDefaultBudget: (limitAmount: number) => Promise<void>;
}

export function BudgetSettingsView({
  selectedMonth,
  monthExpense,
  ledger,
  monthlyBudget,
  onSaveMonthBudget,
  onSaveDefaultBudget,
}: BudgetSettingsViewProps) {
  const effectiveMonthLimit = monthlyBudget?.limitAmount ?? ledger?.defaultMonthlyBudget ?? 25000;
  const [monthLimitStr, setMonthLimitStr] = useState(String(effectiveMonthLimit));
  const [defaultLimitStr, setDefaultLimitStr] = useState(
    String(ledger?.defaultMonthlyBudget ?? 25000)
  );
  const [savingMonth, setSavingMonth] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMonthLimitStr(String(effectiveMonthLimit));
  }, [effectiveMonthLimit, selectedMonth]);

  useEffect(() => {
    if (ledger?.defaultMonthlyBudget !== undefined) {
      setDefaultLimitStr(String(ledger.defaultMonthlyBudget));
    }
  }, [ledger?.defaultMonthlyBudget]);

  const handleMonthBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setErrorMsg(null);
    const { limitAmount, validation } = sanitizeBudgetLimit(Number(monthLimitStr));
    if (!validation.valid) {
      setErrorMsg(validation.error || 'วงเงินไม่ถูกต้อง');
      return;
    }
    setSavingMonth(true);
    try {
      await onSaveMonthBudget(selectedMonth, limitAmount, Boolean(monthlyBudget));
      setFeedback(`บันทึกงบประมาณเดือน ${formatThaiMonthFull(selectedMonth)} เรียบร้อยแล้ว`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถบันทึกงบประมาณได้');
    } finally {
      setSavingMonth(false);
    }
  };

  const handleDefaultBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setErrorMsg(null);
    const { limitAmount, validation } = sanitizeBudgetLimit(Number(defaultLimitStr));
    if (!validation.valid) {
      setErrorMsg(validation.error || 'วงเงินไม่ถูกต้อง');
      return;
    }
    setSavingDefault(true);
    try {
      await onSaveDefaultBudget(limitAmount);
      setFeedback('บันทึกงบประมาณรายเดือนเริ่มต้นเรียบร้อยแล้ว');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถบันทึกงบประมาณเริ่มต้นได้');
    } finally {
      setSavingDefault(false);
    }
  };

  const usageRatio = effectiveMonthLimit > 0 ? (monthExpense / effectiveMonthLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800">
          {errorMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Specific Month Budget */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900">
            งบประมาณรายจ่ายเฉพาะเดือน {formatThaiMonthFull(selectedMonth)}
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            ใช้ติดตามสัดส่วนค่าใช้จ่ายจริงเทียบกับเป้าหมายของเดือนนี้
          </p>

          <div className="mb-5 p-4 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-600">ยอดใช้จ่ายปัจจุบัน</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {formatTHB(monthExpense)} / {formatTHB(effectiveMonthLimit)} ({usageRatio.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  usageRatio > 100
                    ? 'bg-rose-600'
                    : usageRatio >= 85
                      ? 'bg-amber-500'
                      : 'bg-slate-900'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, usageRatio))}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleMonthBudgetSubmit} className="space-y-4">
            <div>
              <label htmlFor="month-budget-input" className="block text-xs font-medium text-slate-700 mb-1.5">
                วงเงินงบประมาณ (บาท)
              </label>
              <input
                id="month-budget-input"
                type="number"
                min="0"
                max={BLUEPRINT_LIMITS.MAX_AMOUNT}
                step="100"
                required
                value={monthLimitStr}
                onChange={(e) => setMonthLimitStr(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={savingMonth}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {savingMonth ? 'กำลังบันทึก...' : 'บันทึกงบประมาณเดือนนี้'}
            </button>
          </form>
        </section>

        {/* Default Monthly Budget */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900">
            งบประมาณรายเดือนเริ่มต้น (ค่าตั้งต้นทุกเดือน)
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            ระบบจะใช้วงเงินนี้สำหรับเดือนที่ยังไม่ได้กำหนดงบประมาณเฉพาะเจาะจง
          </p>

          <form onSubmit={handleDefaultBudgetSubmit} className="space-y-4">
            <div>
              <label htmlFor="default-budget-input" className="block text-xs font-medium text-slate-700 mb-1.5">
                วงเงินงบประมาณมาตรฐานต่อเดือน (บาท)
              </label>
              <input
                id="default-budget-input"
                type="number"
                min="0"
                max={BLUEPRINT_LIMITS.MAX_AMOUNT}
                step="100"
                required
                value={defaultLimitStr}
                onChange={(e) => setDefaultLimitStr(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={savingDefault}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {savingDefault ? 'กำลังบันทึก...' : 'อัปเดตค่าตั้งต้น'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Database className="w-4 h-4 text-slate-700" />
              <span>ข้อมูลการจัดเก็บบนคลาวด์</span>
            </div>
            <p className="font-mono-tabular">
              Firebase Project: {FIREBASE_PROJECT_ID} · Collection: {COLLECTION_ROOT}
            </p>
            <p className="font-mono-tabular text-slate-500 truncate">
              Firestore Database ID: {FIRESTORE_DATABASE_ID}
            </p>
            <div className="flex items-center gap-1.5 text-emerald-700 pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>เข้าสู่ระบบและแยกข้อมูลเฉพาะบัญชี: {ledger?.email}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
