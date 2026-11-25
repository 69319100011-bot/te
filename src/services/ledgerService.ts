import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { COLLECTION_ROOT, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BLUEPRINT_LIMITS, sanitizeBudgetLimit, sanitizeTransactionInput } from '../lib/validation';
import { getCurrentMonthKey, shiftMonthKey } from '../lib/formatters';
import type {
  MonthlyBudgetRecord,
  TransactionInput,
  TransactionRecord,
  UserLedger,
} from '../types/finance';

function ledgerDocRef(uid: string) {
  return doc(db, COLLECTION_ROOT, uid);
}

function transactionsCollectionRef(uid: string) {
  return collection(db, COLLECTION_ROOT, uid, 'transactions');
}

function budgetsCollectionRef(uid: string) {
  return collection(db, COLLECTION_ROOT, uid, 'budgets');
}

export async function ensureUserLedger(user: User): Promise<void> {
  const path = `${COLLECTION_ROOT}/${user.uid}`;
  const ref = ledgerDocRef(user.uid);
  const displayName = (user.displayName || user.email?.split('@')[0] || 'ผู้ใช้งาน')
    .trim()
    .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX_LENGTH);
  const email = (user.email || '').trim().slice(0, BLUEPRINT_LIMITS.EMAIL_MAX_LENGTH);
  const photoURL = (user.photoURL || '').trim().slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX_LENGTH);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        email,
        photoURL,
        currency: 'THB',
        defaultMonthlyBudget: 25000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data() as Partial<UserLedger>;
      if (
        existing.displayName !== displayName ||
        existing.email !== email ||
        existing.photoURL !== photoURL
      ) {
        await updateDoc(ref, {
          displayName,
          email,
          photoURL,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserLedger(
  uid: string,
  onData: (ledger: UserLedger | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `${COLLECTION_ROOT}/${uid}`;
  return onSnapshot(
    ledgerDocRef(uid),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.data() as UserLedger) : null);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeTransactions(
  uid: string,
  onData: (transactions: TransactionRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `${COLLECTION_ROOT}/${uid}/transactions`;
  const q = query(
    transactionsCollectionRef(uid),
    where('userId', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: TransactionRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          type: data.type,
          amount: Number(data.amount),
          category: data.category,
          title: data.title,
          note: data.note ?? '',
          date: data.date,
          monthKey: data.monthKey,
          paymentMethod: data.paymentMethod,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      // Stable secondary sort by createdAt descending for same-day entries
      records.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeMonthlyBudgets(
  uid: string,
  onData: (budgets: Record<string, MonthlyBudgetRecord>) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `${COLLECTION_ROOT}/${uid}/budgets`;
  const q = query(budgetsCollectionRef(uid), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, MonthlyBudgetRecord> = {};
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        map[docSnap.id] = {
          id: docSnap.id,
          userId: data.userId,
          monthKey: data.monthKey,
          limitAmount: Number(data.limitAmount),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      onData(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function addTransaction(uid: string, input: TransactionInput): Promise<void> {
  const { sanitized, validation } = sanitizeTransactionInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const path = `${COLLECTION_ROOT}/${uid}/transactions`;
  try {
    await addDoc(transactionsCollectionRef(uid), {
      userId: uid,
      type: sanitized.type,
      amount: sanitized.amount,
      category: sanitized.category,
      title: sanitized.title,
      note: sanitized.note,
      date: sanitized.date,
      monthKey: sanitized.monthKey,
      paymentMethod: sanitized.paymentMethod,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTransaction(
  uid: string,
  transactionId: string,
  input: TransactionInput
): Promise<void> {
  const { sanitized, validation } = sanitizeTransactionInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const path = `${COLLECTION_ROOT}/${uid}/transactions/${transactionId}`;
  const ref = doc(db, COLLECTION_ROOT, uid, 'transactions', transactionId);
  try {
    await updateDoc(ref, {
      type: sanitized.type,
      amount: sanitized.amount,
      category: sanitized.category,
      title: sanitized.title,
      note: sanitized.note,
      date: sanitized.date,
      monthKey: sanitized.monthKey,
      paymentMethod: sanitized.paymentMethod,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTransaction(uid: string, transactionId: string): Promise<void> {
  const path = `${COLLECTION_ROOT}/${uid}/transactions/${transactionId}`;
  const ref = doc(db, COLLECTION_ROOT, uid, 'transactions', transactionId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertMonthlyBudget(
  uid: string,
  monthKey: string,
  rawLimit: number,
  alreadyExists: boolean
): Promise<void> {
  const { limitAmount, validation } = sanitizeBudgetLimit(rawLimit);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const path = `${COLLECTION_ROOT}/${uid}/budgets/${monthKey}`;
  const ref = doc(db, COLLECTION_ROOT, uid, 'budgets', monthKey);

  try {
    if (alreadyExists) {
      await updateDoc(ref, {
        limitAmount,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: uid,
        monthKey,
        limitAmount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, alreadyExists ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function updateDefaultBudget(uid: string, rawLimit: number): Promise<void> {
  const { limitAmount, validation } = sanitizeBudgetLimit(rawLimit);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const path = `${COLLECTION_ROOT}/${uid}`;
  try {
    await updateDoc(ledgerDocRef(uid), {
      defaultMonthlyBudget: limitAmount,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function seedSampleTransactions(uid: string): Promise<void> {
  const currentMonth = getCurrentMonthKey();
  const prevMonth1 = shiftMonthKey(currentMonth, -1);
  const prevMonth2 = shiftMonthKey(currentMonth, -2);
  const prevMonth3 = shiftMonthKey(currentMonth, -3);

  const sampleItems: TransactionInput[] = [
    // Current month
    { type: 'income', amount: 42000, category: 'เงินเดือน', title: 'เงินเดือนประจำเดือน', note: 'โอนเข้าบัญชีหลัก', date: `${currentMonth}-01`, paymentMethod: 'โอนผ่านธนาคาร' },
    { type: 'income', amount: 8500, category: 'ฟรีแลนซ์ / งานเสริม', title: 'งานออกแบบเว็บไซต์ลูกค้า', note: 'งวดส่งมอบงาน', date: `${currentMonth}-10`, paymentMethod: 'พร้อมเพย์' },
    { type: 'expense', amount: 9500, category: 'ที่อยู่อาศัย / ค่าเช่า', title: 'ค่าเช่าคอนโดและส่วนกลาง', note: '', date: `${currentMonth}-02`, paymentMethod: 'โอนผ่านธนาคาร' },
    { type: 'expense', amount: 1850, category: 'ค่าน้ำ / ค่าไฟ / เน็ต', title: 'ค่าไฟฟ้าและอินเทอร์เน็ตบ้าน', note: 'รวม 2 บิล', date: `${currentMonth}-05`, paymentMethod: 'พร้อมเพย์' },
    { type: 'expense', amount: 3420, category: 'อาหารและเครื่องดื่ม', title: 'ค่าอาหารสัปดาห์ที่ 1-2', note: 'ซื้อของสดและมื้อกลางวัน', date: `${currentMonth}-08`, paymentMethod: 'พร้อมเพย์' },
    { type: 'expense', amount: 1450, category: 'เดินทาง / น้ำมัน', title: 'เติมน้ำมันและบัตรรถไฟฟ้า', note: '', date: `${currentMonth}-12`, paymentMethod: 'บัตรเครดิต' },
    { type: 'expense', amount: 5000, category: 'ออมเงิน / ลงทุน', title: 'ออมกองทุนรวม DCA', note: 'ตัดบัญชีอัตโนมัติ', date: `${currentMonth}-15`, paymentMethod: 'โอนผ่านธนาคาร' },
    { type: 'expense', amount: 2290, category: 'ช้อปปิ้ง / ของใช้', title: 'ของใช้ภายในบ้านและอุปกรณ์ทำงาน', note: '', date: `${currentMonth}-17`, paymentMethod: 'บัตรเครดิต' },

    // Previous month -1
    { type: 'income', amount: 42000, category: 'เงินเดือน', title: 'เงินเดือนประจำเดือน', note: '', date: `${prevMonth1}-01`, paymentMethod: 'โอนผ่านธนาคาร' },
    { type: 'income', amount: 5200, category: 'ขายสินค้า', title: 'ขายอุปกรณ์ไอทีมือสอง', note: '', date: `${prevMonth1}-18`, paymentMethod: 'พร้อมเพย์' },
    { type: 'expense', amount: 9500, category: 'ที่อยู่อาศัย / ค่าเช่า', title: 'ค่าเช่าคอนโด', note: '', date: `${prevMonth1}-02`, paymentMethod: 'โอนผ่านธนาคาร' },
    { type: 'expense', amount: 6800, category: 'อาหารและเครื่องดื่ม', title: 'ค่าอาหารตลอดเดือน', note: '', date: `${prevMonth1}-14`, paymentMethod: 'พร้อมเพย์' },
    { type: 'expense', amount: 2100, category: 'ค่าน้ำ / ค่าไฟ / เน็ต', title: 'ค่าสาธารณูปโภค', note: '', date: `${prevMonth1}-06`, paymentMethod: 'พร้อมเพย์' },
    { type: 'expense', amount: 2400, category: 'เดินทาง / น้ำมัน', title: 'ค่าเดินทางรายเดือน', note: '', date: `${prevMonth1}-20`, paymentMethod: 'บัตรเครดิต' },
    { type: 'expense', amount: 5000, category: 'ออมเงิน / ลงทุน', title: 'ออมกองทุนรวม DCA', note: '', date: `${prevMonth1}-15`, paymentMethod: 'โอนผ่านธนาคาร' },

    // Previous month -2
    { type: 'income', amount: 42000, category: 'เงินเดือน', title: 'เงินเดือนประจำเดือน', note: '', date: `${prevMonth2}-01`, paymentMethod: 'โอนผ่านธนาคาร' },
    { type: 'income', amount: 12000, category: 'โบนัส / ค่าคอมมิชชัน', title: 'ค่าคอมมิชชันไตรมาส', note: '', date: `${prevMonth2}-25`, paymentMethod: 'โอนผ่านธนาคาร' },
    { type: 'expense', amount: 9500, category: 'ที่อยู่อาศัย / ค่าเช่า', title: 'ค่าเช่าคอนโด', note: '', date: `${prevMonth2}-02`, paymentMethod: 'โอนผ่านธนาคาร' },
    { type: 'expense', amount: 7200, category: 'อาหารและเครื่องดื่ม', title: 'ค่าอาหารและเลี้ยงทีม', note: '', date: `${prevMonth2}-19`, paymentMethod: 'บัตรเครดิต' },
    { type: 'expense', amount: 3900, category: 'สุขภาพ / การแพทย์', title: 'ตรวจสุขภาพประจำปี', note: '', date: `${prevMonth2}-22`, paymentMethod: 'บัตรเครดิต' },
    { type: 'expense', amount: 5000, category: 'ออมเงิน / ลงทุน', title: 'ออมกองทุนรวม DCA', note: '', date: `${prevMonth2}-15`, paymentMethod: 'โอนผ่านธนาคาร' },

    // Previous month -3
    { type: 'income', amount: 42000, category: 'เงินเดือน', title: 'เงินเดือนประจำเดือน', note: '', date: `${prevMonth3}-01`, paymentMethod: 'โอนผ่านธนาคาร' },
    { type: 'expense', amount: 9500, category: 'ที่อยู่อาศัย / ค่าเช่า', title: 'ค่าเช่าคอนโด', note: '', date: `${prevMonth3}-02`, paymentMethod: 'โอนผ่านธนาคาร' },
    { type: 'expense', amount: 6400, category: 'อาหารและเครื่องดื่ม', title: 'ค่าอาหารรายเดือน', note: '', date: `${prevMonth3}-16`, paymentMethod: 'พร้อมเพย์' },
    { type: 'expense', amount: 3100, category: 'บันเทิง / สมาชิกรายเดือน', title: 'ค่าสมาชิกซอฟต์แวร์และดูหนัง', note: '', date: `${prevMonth3}-10`, paymentMethod: 'บัตรเครดิต' },
    { type: 'expense', amount: 5000, category: 'ออมเงิน / ลงทุน', title: 'ออมกองทุนรวม DCA', note: '', date: `${prevMonth3}-15`, paymentMethod: 'โอนผ่านธนาคาร' },
  ];

  const path = `${COLLECTION_ROOT}/${uid}/transactions`;
  try {
    const batch = writeBatch(db);
    for (const item of sampleItems) {
      const { sanitized, validation } = sanitizeTransactionInput(item);
      if (!validation.valid) continue;
      const newRef = doc(transactionsCollectionRef(uid));
      batch.set(newRef, {
        userId: uid,
        type: sanitized.type,
        amount: sanitized.amount,
        category: sanitized.category,
        title: sanitized.title,
        note: sanitized.note,
        date: sanitized.date,
        monthKey: sanitized.monthKey,
        paymentMethod: sanitized.paymentMethod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
