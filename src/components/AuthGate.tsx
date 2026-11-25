import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, BarChart3, CalendarRange, Lock, ShieldCheck } from 'lucide-react';
import { auth, COLLECTION_ROOT, FIREBASE_PROJECT_ID, googleProvider } from '../lib/firebase';

export function AuthGate() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('คุณได้ปิดหน้าต่างเข้าสู่ระบบก่อนดำเนินการเสร็จสิ้น กรุณาลองใหม่อีกครั้ง');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ กรุณาอนุญาต Pop-up แล้วลองใหม่อีกครั้ง');
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg('โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Authentication');
      } else {
        setErrorMsg('ไม่สามารถเข้าสู่ระบบด้วย Gmail ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
      }
      console.error('Google Sign-In error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar Contract: 3 zones, 1-line brand wordmark */}
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            คลังเงิน
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              ความสามารถหลัก
            </a>
            <a href="#security" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              ความปลอดภัยข้อมูล
            </a>
          </nav>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            {isLoading ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบด้วย Gmail'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-6 py-12 lg:py-16 grid lg:grid-cols-12 gap-12 items-stretch">
          {/* Left Hero & Sign In */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-medium text-slate-500 mb-3">
              สมุดบัญชีรายเดือนส่วนบุคคล · Firebase {FIREBASE_PROJECT_ID} · {COLLECTION_ROOT}
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-bold tracking-tight text-slate-900 leading-[1.2] text-balance mb-5">
              บันทึกรายรับรายจ่ายรายเดือน พร้อมกราฟวิเคราะห์กระแสเงินสดอย่างเป็นระบบ
            </h1>
            <p className="text-base text-slate-600 leading-relaxed mb-8 max-w-xl">
              ติดตามรายรับ รายจ่าย เงินคงเหลือสุทธิ และวงเงินงบประมาณรายเดือนได้แบบเรียลไทม์
              แยกข้อมูลเป็นสัดส่วนตามบัญชี Gmail ของคุณอย่างปลอดภัย
            </p>

            {errorMsg && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800"
              >
                {errorMsg}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 mb-10">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-3 px-6 py-3.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Gmail'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500">
                ยืนยันตัวตนผ่าน Google Firebase Authentication
              </span>
            </div>

            <div id="features" className="grid sm:grid-cols-3 gap-5 pt-6 border-t border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
                  <CalendarRange className="w-4 h-4 text-slate-700" />
                  <span>สรุปผลรายเดือน</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  เปรียบเทียบรายรับ รายจ่าย และอัตราการออมย้อนหลังแบบรายเดือนอัตโนมัติ
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
                  <BarChart3 className="w-4 h-4 text-slate-700" />
                  <span>กราฟวิเคราะห์ข้อมูล</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ดูสัดส่วนหมวดหมู่ แนวโน้มรายวัน และเปรียบเทียบหลายเดือนในหน้าเดียว
                </p>
              </div>
              <div id="security">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  <span>แยกสิทธิ์เฉพาะเจ้าของ</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  จัดเก็บภายใต้ Firestore {COLLECTION_ROOT} ที่เข้าถึงได้เฉพาะบัญชี Gmail ของคุณ
                </p>
              </div>
            </div>
          </div>

          {/* Right Structural Ledger Preview */}
          <div className="lg:col-span-6 flex items-center">
            <div className="w-full bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">ตัวอย่างโครงสร้างรายงานรายเดือน</p>
                  <p className="text-base font-semibold text-slate-900">สรุปภาพรวมกระแสเงินสด</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Lock className="w-3.5 h-3.5" />
                  <span>เข้ารหัสและแยกตาม UID</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pb-6 mb-6 border-b border-slate-200">
                <div>
                  <p className="text-xs text-slate-500 mb-1">รายรับรวม</p>
                  <p className="text-lg font-semibold font-mono-tabular text-emerald-700">
                    +฿50,500
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">รายจ่ายรวม</p>
                  <p className="text-lg font-semibold font-mono-tabular text-rose-700">
                    -฿23,510
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">คงเหลือสุทธิ</p>
                  <p className="text-lg font-semibold font-mono-tabular text-slate-900">
                    ฿26,990
                  </p>
                </div>
              </div>

              {/* Clean SVG Bar Chart Preview */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>เปรียบเทียบรายรับ - รายจ่าย 6 เดือน</span>
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs inline-block" />
                      รายรับ
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-rose-600 rounded-xs inline-block" />
                      รายจ่าย
                    </span>
                  </div>
                </div>
                <svg viewBox="0 0 420 130" className="w-full h-32" aria-label="ตัวอย่างกราฟรายเดือน">
                  <line x1="0" y1="105" x2="420" y2="105" stroke="#E2E8F0" strokeWidth="1" />
                  <line x1="0" y1="60" x2="420" y2="60" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="15" x2="420" y2="15" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                  {[
                    { m: 'มิ.ย.', inc: 74, exp: 42 },
                    { m: 'ก.ค.', inc: 78, exp: 48 },
                    { m: 'ส.ค.', inc: 82, exp: 45 },
                    { m: 'ก.ย.', inc: 88, exp: 52 },
                    { m: 'ต.ค.', inc: 80, exp: 46 },
                    { m: 'พ.ย.', inc: 92, exp: 49 },
                  ].map((item, idx) => {
                    const x = 22 + idx * 66;
                    return (
                      <g key={item.m}>
                        <rect
                          x={x}
                          y={105 - item.inc}
                          width="16"
                          height={item.inc}
                          rx="3"
                          fill="#059669"
                        />
                        <rect
                          x={x + 20}
                          y={105 - item.exp}
                          width="16"
                          height={item.exp}
                          rx="3"
                          fill="#E11D48"
                        />
                        <text
                          x={x + 18}
                          y="122"
                          textAnchor="middle"
                          fontSize="11"
                          fill="#64748B"
                        >
                          {item.m}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="font-medium text-slate-900">เงินเดือนประจำเดือน</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">เงินเดือน</span>
                  </div>
                  <span className="font-mono-tabular font-medium text-emerald-700">+฿42,000</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="font-medium text-slate-900">ค่าเช่าคอนโดและส่วนกลาง</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">ที่อยู่อาศัย</span>
                  </div>
                  <span className="font-mono-tabular font-medium text-rose-700">-฿9,500</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
