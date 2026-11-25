import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getCategoriesByType, PAYMENT_METHODS } from '../constants/categories';
import { getTodayDateString } from '../lib/formatters';
import { BLUEPRINT_LIMITS, sanitizeTransactionInput } from '../lib/validation';
import type { TransactionInput, TransactionRecord, TransactionType } from '../types/finance';

interface TransactionModalProps {
  isOpen: boolean;
  editingTransaction: TransactionRecord | null;
  defaultMonthKey: string;
  onClose: () => void;
  onSubmit: (input: TransactionInput, editingId?: string) => Promise<void>;
}

export function TransactionModal({
  isOpen,
  editingTransaction,
  defaultMonthKey,
  onClose,
  onSubmit,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (editingTransaction) {
      setType(editingTransaction.type);
      setTitle(editingTransaction.title);
      setAmountStr(String(editingTransaction.amount));
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.paymentMethod);
      setNote(editingTransaction.note);
    } else {
      const today = getTodayDateString();
      const defaultDate = today.startsWith(defaultMonthKey) ? today : `${defaultMonthKey}-01`;
      setType('expense');
      setTitle('');
      setAmountStr('');
      setCategory(getCategoriesByType('expense')[0].name);
      setDate(defaultDate);
      setPaymentMethod(PAYMENT_METHODS[0]);
      setNote('');
    }
  }, [isOpen, editingTransaction, defaultMonthKey]);

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextCats = getCategoriesByType(nextType);
    if (!nextCats.some((c) => c.name === category)) {
      setCategory(nextCats[0].name);
    }
  };

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = Number(amountStr);
    const payload: TransactionInput = {
      type,
      amount: parsedAmount,
      category,
      title,
      note,
      date,
      paymentMethod,
    };

    const { validation } = sanitizeTransactionInput(payload);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'ข้อมูลไม่ถูกต้อง');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payload, editingTransaction?.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถบันทึกรายการได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = getCategoriesByType(type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 id="tx-modal-title" className="text-base font-semibold text-slate-900">
            {editingTransaction ? 'แก้ไขรายการรายรับ-รายจ่าย' : 'บันทึกรายการใหม่'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          {/* Type Switch */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">ประเภทรายการ</label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายจ่าย (Expense)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  type === 'income'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายรับ (Income)
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-amount" className="block text-xs font-medium text-slate-700 mb-1.5">
                จำนวนเงิน (บาท)
              </label>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={BLUEPRINT_LIMITS.MAX_AMOUNT}
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
              />
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                วันที่ทำรายการ
              </label>
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tx-title" className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อรายการ
            </label>
            <input
              id="tx-title"
              type="text"
              required
              maxLength={BLUEPRINT_LIMITS.TITLE_MAX_LENGTH}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'income' ? 'เช่น เงินเดือน, ค่าออกแบบเว็บไซต์' : 'เช่น ค่าอาหารกลางวัน, ค่าไฟฟ้า'}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-category" className="block text-xs font-medium text-slate-700 mb-1.5">
                หมวดหมู่
              </label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
              >
                {categories.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-payment" className="block text-xs font-medium text-slate-700 mb-1.5">
                ช่องทางชำระเงิน
              </label>
              <select
                id="tx-payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tx-note" className="block text-xs font-medium text-slate-700 mb-1.5">
              หมายเหตุเพิ่มเติม (ไม่บังคับ)
            </label>
            <textarea
              id="tx-note"
              rows={2}
              maxLength={BLUEPRINT_LIMITS.NOTE_MAX_LENGTH}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม เช่น ชื่อร้านค้า หรือเลขที่อ้างอิง"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900 resize-none"
            />
          </div>

          {errorMsg && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSubmitting ? 'กำลังบันทึก...' : editingTransaction ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
