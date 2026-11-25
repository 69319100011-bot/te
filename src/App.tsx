import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Plus,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { BudgetSettingsView } from './components/BudgetSettingsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MonthlySummaryTable } from './components/MonthlySummaryTable';
import { TransactionModal } from './components/TransactionModal';
import { TransactionTable } from './components/TransactionTable';
import { CategoryDonutChart } from './components/charts/CategoryDonutChart';
import { DailyCashflowChart } from './components/charts/DailyCashflowChart';
import { MonthlyComparisonChart } from './components/charts/MonthlyComparisonChart';
import { auth } from './lib/firebase';
import {
  formatTHB,
  formatThaiMonthFull,
  getCurrentMonthKey,
  shiftMonthKey,
} from './lib/formatters';
import {
  addTransaction,
  deleteTransaction,
  ensureUserLedger,
  seedSampleTransactions,
  subscribeMonthlyBudgets,
  subscribeTransactions,
  subscribeUserLedger,
  updateDefaultBudget,
  updateTransaction,
  upsertMonthlyBudget,
} from './services/ledgerService';
import type {
  ActiveView,
  MonthlyBudgetRecord,
  TransactionInput,
  TransactionRecord,
  UserLedger,
} from './types/finance';

function LedgerApp() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [ledger, setLedger] = useState<UserLedger | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [budgets, setBudgets] = useState<Record<string, MonthlyBudgetRecord>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Throw fatal Firestore errors to ErrorBoundary
  if (fatalError) {
    throw fatalError;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (!user) {
        setLedger(null);
        setTransactions([]);
        setBudgets({});
        setDataLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser) return;

    let cancelled = false;
    let unsubLedger: (() => void) | undefined;
    let unsubTx: (() => void) | undefined;
    let unsubBudgets: (() => void) | undefined;

    setDataLoading(true);

    ensureUserLedger(authUser)
      .then(() => {
        if (cancelled) return;
        unsubLedger = subscribeUserLedger(
          authUser.uid,
          (data) => {
            setLedger(data);
          },
          (err) => setFatalError(err)
        );
        unsubTx = subscribeTransactions(
          authUser.uid,
          (rows) => {
            setTransactions(rows);
            setDataLoading(false);
          },
          (err) => setFatalError(err)
        );
        unsubBudgets = subscribeMonthlyBudgets(
          authUser.uid,
          (map) => {
            setBudgets(map);
          },
          (err) => setFatalError(err)
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
      unsubLedger?.();
      unsubTx?.();
      unsubBudgets?.();
    };
  }, [authUser]);

  const monthStats = useMemo(() => {
    const prevMonth = shiftMonthKey(selectedMonth, -1);
    let income = 0;
    let expense = 0;
    let prevIncome = 0;
    let prevExpense = 0;
    let count = 0;

    for (const tx of transactions) {
      if (tx.monthKey === selectedMonth) {
        count += 1;
        if (tx.type === 'income') income += tx.amount;
        else expense += tx.amount;
      } else if (tx.monthKey === prevMonth) {
        if (tx.type === 'income') prevIncome += tx.amount;
        else prevExpense += tx.amount;
      }
    }

    const net = income - expense;
    const savingsRate = income > 0 ? (net / income) * 100 : 0;
    const incomeDelta = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : null;
    const expenseDelta = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : null;
    const budgetLimit = budgets[selectedMonth]?.limitAmount ?? ledger?.defaultMonthlyBudget ?? 25000;
    const budgetPercent = budgetLimit > 0 ? (expense / budgetLimit) * 100 : 0;

    return {
      income,
      expense,
      net,
      count,
      savingsRate,
      incomeDelta,
      expenseDelta,
      budgetLimit,
      budgetPercent,
    };
  }, [transactions, selectedMonth, budgets, ledger]);

  const handleOpenAdd = () => {
    setEditingTx(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (tx: TransactionRecord) => {
    setEditingTx(tx);
    setModalOpen(true);
  };

  const handleSubmitTransaction = async (input: TransactionInput, editingId?: string) => {
    if (!authUser) return;
    if (editingId) {
      await updateTransaction(authUser.uid, editingId, input);
    } else {
      await addTransaction(authUser.uid, input);
    }
    // Automatically jump to the month of the saved transaction if user created one in a different month
    const targetMonth = input.date.slice(0, 7);
    if (targetMonth && targetMonth !== selectedMonth) {
      setSelectedMonth(targetMonth);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!authUser) return;
    await deleteTransaction(authUser.uid, txId);
  };

  const handleSeedSampleData = async () => {
    if (!authUser || isSeeding) return;
    setIsSeeding(true);
    try {
      await seedSampleTransactions(authUser.uid);
      setSelectedMonth(getCurrentMonthKey());
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthGate />;
  }

  const navItems: { id: ActiveView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'ภาพรวมรายเดือน', icon: LayoutDashboard },
    { id: 'analytics', label: 'กราฟวิเคราะห์ข้อมูล', icon: BarChart3 },
    { id: 'ledger', label: 'รายการทั้งหมด', icon: ListOrdered },
    { id: 'budget', label: 'ตั้งค่างบประมาณ', icon: SlidersHorizontal },
  ];

  const activeNavTitle = navItems.find((n) => n.id === activeView)?.label || 'ภาพรวมรายเดือน';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        <div className="px-6 py-5 border-b border-slate-200">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            คลังเงิน
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            {authUser.photoURL ? (
              <img
                src={authUser.photoURL}
                alt={authUser.displayName || 'รูปโปรไฟล์ผู้ใช้'}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                {(authUser.displayName || authUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {authUser.displayName || 'ผู้ใช้งาน'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{authUser.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col border-r border-slate-200 z-10">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">คลังเงิน</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
                aria-label="ปิดเมนู"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-900 truncate mb-0.5">
                {authUser.displayName || 'ผู้ใช้งาน'}
              </p>
              <p className="text-[11px] text-slate-500 truncate mb-3">{authUser.email}</p>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
                aria-label="เปิดเมนู"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-slate-400 hidden sm:inline">บัญชีรายเดือน</span>
                <span className="text-slate-300 hidden sm:inline">/</span>
                <h1 className="font-semibold text-slate-900 truncate">{activeNavTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Month Picker Controls */}
              <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSelectedMonth((m) => shiftMonthKey(m, -1))}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                  aria-label="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) setSelectedMonth(e.target.value);
                  }}
                  aria-label="เลือกเดือน"
                  className="px-2 py-1 text-xs font-medium font-mono-tabular text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setSelectedMonth((m) => shiftMonthKey(m, 1))}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                  aria-label="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">บันทึกรายการ</span>
                <span className="sm:hidden">เพิ่ม</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          {/* Active Month Banner Line */}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">สรุปข้อมูลประจำเดือน</p>
              <p className="text-xl font-bold text-slate-900">{formatThaiMonthFull(selectedMonth)}</p>
            </div>
            <p className="text-xs text-slate-500 font-mono-tabular">
              รายการในเดือนนี้ {monthStats.count} รายการ
            </p>
          </div>

          {/* Loading Skeleton */}
          {dataLoading ? (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="p-5 space-y-2 animate-pulse">
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                    <div className="h-7 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
              <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {/* Empty Account Onboarding Banner when user has 0 transactions globally */}
              {transactions.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      เริ่มต้นสมุดบัญชีของคุณในฐานข้อมูล 69319100011DB
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      คุณสามารถกด “บันทึกรายการ” เพื่อกรอกข้อมูลจริง หรือโหลดชุดข้อมูลตัวอย่าง 4 เดือนเพื่อทดลองดูกราฟวิเคราะห์ผลทันที
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSeedSampleData}
                      disabled={isSeeding}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isSeeding ? 'กำลังเพิ่มตัวอย่าง...' : 'โหลดข้อมูลตัวอย่าง 4 เดือน'}
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      บันทึกรายการแรก
                    </button>
                  </div>
                </div>
              )}

              {/* 4-Column KPI Strip (Single Flat Container with Hairline Dividers) */}
              <section
                aria-label="สรุปยอดประจำเดือน"
                className="grid sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
              >
                <div className="p-5">
                  <p className="text-xs font-medium text-slate-500">รายรับรวมเดือนนี้</p>
                  <p className="text-2xl font-bold font-mono-tabular text-emerald-700 mt-1.5">
                    +{formatTHB(monthStats.income)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 font-mono-tabular">
                    {monthStats.incomeDelta === null
                      ? 'เทียบเดือนก่อน: ไม่มีข้อมูล'
                      : `เทียบเดือนก่อน: ${monthStats.incomeDelta >= 0 ? '+' : ''}${monthStats.incomeDelta.toFixed(1)}%`}
                  </p>
                </div>

                <div className="p-5">
                  <p className="text-xs font-medium text-slate-500">รายจ่ายรวมเดือนนี้</p>
                  <p className="text-2xl font-bold font-mono-tabular text-rose-700 mt-1.5">
                    -{formatTHB(monthStats.expense)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 font-mono-tabular">
                    {monthStats.expenseDelta === null
                      ? 'เทียบเดือนก่อน: ไม่มีข้อมูล'
                      : `เทียบเดือนก่อน: ${monthStats.expenseDelta >= 0 ? '+' : ''}${monthStats.expenseDelta.toFixed(1)}%`}
                  </p>
                </div>

                <div className="p-5">
                  <p className="text-xs font-medium text-slate-500">คงเหลือสุทธิ</p>
                  <p
                    className={`text-2xl font-bold font-mono-tabular mt-1.5 ${
                      monthStats.net >= 0 ? 'text-slate-900' : 'text-rose-700'
                    }`}
                  >
                    {monthStats.net >= 0 ? '+' : ''}
                    {formatTHB(monthStats.net)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 font-mono-tabular">
                    อัตราการออม: {monthStats.income > 0 ? `${monthStats.savingsRate.toFixed(1)}%` : '—'}
                  </p>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">งบประมาณรายจ่าย</p>
                    <button
                      type="button"
                      onClick={() => setActiveView('budget')}
                      className="text-[11px] font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 cursor-pointer"
                    >
                      ตั้งค่า
                    </button>
                  </div>
                  <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-1.5">
                    {monthStats.budgetLimit > 0 ? `${monthStats.budgetPercent.toFixed(0)}%` : 'ไม่จำกัด'}
                  </p>
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          monthStats.budgetPercent > 100
                            ? 'bg-rose-600'
                            : monthStats.budgetPercent >= 85
                              ? 'bg-amber-500'
                              : 'bg-slate-900'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, monthStats.budgetPercent))}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono-tabular">
                      เป้า {formatTHB(monthStats.budgetLimit)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Active View Body */}
              {activeView === 'overview' && (
                <div className="space-y-6">
                  <div className="grid xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-7">
                      <MonthlyComparisonChart
                        transactions={transactions}
                        selectedMonth={selectedMonth}
                        onSelectMonth={setSelectedMonth}
                      />
                    </div>
                    <div className="xl:col-span-5">
                      <CategoryDonutChart
                        transactions={transactions}
                        selectedMonth={selectedMonth}
                      />
                    </div>
                  </div>

                  <TransactionTable
                    transactions={transactions}
                    selectedMonth={selectedMonth}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteTransaction}
                    onAddNew={handleOpenAdd}
                  />
                </div>
              )}

              {activeView === 'analytics' && (
                <div className="space-y-6">
                  <MonthlyComparisonChart
                    transactions={transactions}
                    selectedMonth={selectedMonth}
                    onSelectMonth={setSelectedMonth}
                  />
                  <div className="grid xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-7">
                      <DailyCashflowChart
                        transactions={transactions}
                        selectedMonth={selectedMonth}
                      />
                    </div>
                    <div className="xl:col-span-5">
                      <CategoryDonutChart
                        transactions={transactions}
                        selectedMonth={selectedMonth}
                      />
                    </div>
                  </div>
                  <MonthlySummaryTable
                    transactions={transactions}
                    budgets={budgets}
                    defaultBudget={ledger?.defaultMonthlyBudget ?? 25000}
                    selectedMonth={selectedMonth}
                    onSelectMonth={setSelectedMonth}
                  />
                </div>
              )}

              {activeView === 'ledger' && (
                <TransactionTable
                  transactions={transactions}
                  selectedMonth={selectedMonth}
                  showAllMonths
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteTransaction}
                  onAddNew={handleOpenAdd}
                />
              )}

              {activeView === 'budget' && (
                <BudgetSettingsView
                  selectedMonth={selectedMonth}
                  monthExpense={monthStats.expense}
                  ledger={ledger}
                  monthlyBudget={budgets[selectedMonth]}
                  onSaveMonthBudget={async (monthKey, limit, exists) => {
                    if (!authUser) return;
                    await upsertMonthlyBudget(authUser.uid, monthKey, limit, exists);
                  }}
                  onSaveDefaultBudget={async (limit) => {
                    if (!authUser) return;
                    await updateDefaultBudget(authUser.uid, limit);
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      <TransactionModal
        isOpen={modalOpen}
        editingTransaction={editingTx}
        defaultMonthKey={selectedMonth}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(null);
        }}
        onSubmit={handleSubmitTransaction}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LedgerApp />
    </ErrorBoundary>
  );
}
