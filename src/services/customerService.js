import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

const CUSTOMERS_COLLECTION = 'customers';

export const customerService = {
  /**
   * Real-time subscription to all customers
   */
  subscribeToCustomers: (callback) => {
    const q = query(collection(db, CUSTOMERS_COLLECTION), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(customers);
    }, (error) => {
      console.error('Error subscribing to customers:', error);
    });
  },

  /**
   * Add a new customer
   */
  addCustomer: async (customerData) => {
    try {
      const ref = await addDoc(collection(db, CUSTOMERS_COLLECTION), {
        ...customerData,
        totalSpend: 0,
        totalOrders: 0,
        loyaltyPoints: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  },

  /**
   * Update customer profile
   */
  updateCustomer: async (id, updates) => {
    try {
      const ref = doc(db, CUSTOMERS_COLLECTION, id);
      await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  /**
   * Delete a customer
   */
  deleteCustomer: async (id) => {
    try {
      await deleteDoc(doc(db, CUSTOMERS_COLLECTION, id));
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  },

  /**
   * Update spend and loyalty points after a sale
   */
  recordPurchase: async (customerId, amount) => {
    try {
      const ref = doc(db, CUSTOMERS_COLLECTION, customerId);
      // Use raw firestore increment
      const { increment } = await import('firebase/firestore');
      await updateDoc(ref, {
        totalSpend: increment(amount),
        totalOrders: increment(1),
        loyaltyPoints: increment(Math.floor(amount)),
        lastPurchaseAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error recording purchase:', error);
      throw error;
    }
  },
};
