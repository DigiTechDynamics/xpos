import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

const LOGS_COLLECTION = 'inventoryLogs';

export const inventoryService = {
  /**
   * Log a stock movement
   * @param {string} productId - ID of the product
   * @param {number} change - Amount changed (positive for addition, negative for deduction)
   * @param {string} reason - Reason for adjustment (e.g., 'sale', 'restock', 'correction', 'damage')
   * @param {string} [orderId=null] - Optional order ID associated with the movement
   */
  logStockMovement: async (productId, change, reason, orderId = null) => {
    try {
      await addDoc(collection(db, LOGS_COLLECTION), {
        productId,
        change,
        reason,
        orderId,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error logging stock movement:", error);
      throw error;
    }
  },

  /**
   * Get inventory logs for a specific product
   * @param {string} productId 
   */
  getInventoryLogs: async (productId) => {
    try {
      const q = query(
        collection(db, LOGS_COLLECTION), 
        where('productId', '==', productId),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching inventory logs:", error);
      throw error;
    }
  }
};
