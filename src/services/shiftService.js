import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from './firebase';

const SHIFTS_COLLECTION = 'shifts';

export const shiftService = {
  /**
   * Open a new cashier shift. Returns the shift ID.
   */
  openShift: async ({ cashierId, cashierName, openingFloat = 0 }) => {
    const ref = await addDoc(collection(db, SHIFTS_COLLECTION), {
      cashierId,
      cashierName,
      openingFloat,
      status: 'open',
      openedAt: serverTimestamp(),
      closedAt: null,
      closingSummary: null,
    });
    return ref.id;
  },

  /**
   * Close the active shift with a closing summary.
   */
  closeShift: async (shiftId, { closingFloat, totalCash, totalCard, totalQR, totalOrders, totalRevenue, notes = '' }) => {
    const shiftRef = doc(db, SHIFTS_COLLECTION, shiftId);
    await updateDoc(shiftRef, {
      status: 'closed',
      closedAt: serverTimestamp(),
      closingSummary: {
        closingFloat,
        totalCash,
        totalCard,
        totalQR,
        totalOrders,
        totalRevenue,
        notes,
        variance: closingFloat - totalCash, // expected cash vs actual
      },
    });
  },

  /**
   * Get the currently open shift (if any) for a cashier.
   */
  getActiveShift: async (cashierId) => {
    const q = query(
      collection(db, SHIFTS_COLLECTION),
      where('cashierId', '==', cashierId),
      where('status', '==', 'open'),
      orderBy('openedAt', 'desc'),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  },

  /**
   * Get all shifts, newest first.
   */
  getAllShifts: async () => {
    const q = query(collection(db, SHIFTS_COLLECTION), orderBy('openedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /**
   * Get all shifts for a specific cashier.
   */
  getShiftsByUser: async (cashierId) => {
    const q = query(
      collection(db, SHIFTS_COLLECTION),
      where('cashierId', '==', cashierId),
      orderBy('openedAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};
