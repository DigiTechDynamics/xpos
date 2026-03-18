import { 
  collection, 
  addDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  increment,
  runTransaction,
  writeBatch,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

const ORDERS_COLLECTION = 'orders';

export const orderService = {
  /**
   * Submit a new order to Firestore
   * @param {Object} orderData - The order details (items, subtotal, tax, total, etc.)
   */
  submitOrder: async (orderData) => {
    try {
      const { writeBatch, doc, collection, serverTimestamp, increment } = await import('firebase/firestore');
      
      const batch = writeBatch(db);
      const orderRef = doc(collection(db, ORDERS_COLLECTION));
      
      // 1. Process each item to update stock
      for (const item of orderData.items) {
        // Handle Bundles (decrement components)
        if (item.isBundle && item.bundleItems && Array.isArray(item.bundleItems)) {
          for (const component of item.bundleItems) {
            const compRef = doc(db, 'products', component.productId);
            const qtyToDeduct = (component.quantity || 1) * (item.quantity || 1);
            
            batch.update(compRef, {
              stock: increment(-qtyToDeduct),
              updatedAt: serverTimestamp()
            });

            // Log component movement
            const compLogRef = doc(collection(db, 'inventoryLogs'));
            batch.set(compLogRef, {
              productId: component.productId,
              change: -qtyToDeduct,
              reason: 'bundle_sale',
              orderId: orderRef.id,
              parentBundleId: item.id,
              timestamp: serverTimestamp()
            });
          }
        } else {
          // Standard item or variant (direct stock decrement)
          const productRef = doc(db, 'products', item.id);
          
          batch.update(productRef, {
            stock: increment(-(item.quantity || 1)),
            updatedAt: serverTimestamp()
          });

          // Log inventory movement
          const logRef = doc(collection(db, 'inventoryLogs'));
          batch.set(logRef, {
            productId: item.id,
            change: -(item.quantity || 1),
            reason: 'sale',
            orderId: orderRef.id,
            timestamp: serverTimestamp()
          });
        }
      }

      // 3. Create the order
      batch.set(orderRef, {
        ...orderData,
        timestamp: serverTimestamp(),
        status: 'completed',
        cashierId: orderData.user?.uid || 'anonymous',
        cashierName: orderData.user?.email || 'System'
      });

      await batch.commit();
      const orderId = orderRef.id;

      console.log("Order submitted with ID: ", orderId);
      return orderId;
    } catch (error) {
      console.error("Error submitting order: ", error);
      throw error;
    }
  },

  /**
   * Subscribe to orders from Firestore in real-time
   * @param {Function} callback - Function to handle the fetched orders
   */
  subscribeToOrders: (callback) => {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(orders);
    });
  },

  /**
   * Void an order and restore stock
   * @param {Object} order - The full order object to void
   */
  voidOrder: async (order) => {
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, ORDERS_COLLECTION, order.id);
        
        // 1. Check if already voided
        const orderSnap = await transaction.get(orderRef);
        if (orderSnap.data().status === 'voided') {
          throw new Error("Order is already voided.");
        }

        // 2. Process each item to restore stock
        for (const item of order.items) {
          if (item.isBundle && item.bundleItems && Array.isArray(item.bundleItems)) {
            for (const component of item.bundleItems) {
              const compRef = doc(db, 'products', component.productId);
              const qtyToRestore = (component.quantity || 1) * (item.quantity || 1);
              
              transaction.update(compRef, {
                stock: increment(qtyToRestore),
                updatedAt: serverTimestamp()
              });

              // Log component restoration
              const compLogRef = doc(collection(db, 'inventoryLogs'));
              transaction.set(compLogRef, {
                productId: component.productId,
                change: qtyToRestore,
                reason: 'voided_bundle_sale',
                orderId: order.id,
                timestamp: serverTimestamp()
              });
            }
          } else {
            const productRef = doc(db, 'products', item.id);
            
            // Atomically increment stock back
            transaction.update(productRef, {
              stock: increment(item.quantity || 1),
              updatedAt: serverTimestamp()
            });

            // 3. Log inventory movement (positive change for void)
            const logRef = doc(collection(db, 'inventoryLogs'));
            transaction.set(logRef, {
              productId: item.id,
              change: (item.quantity || 1),
              reason: 'voided_order',
              orderId: order.id,
              timestamp: serverTimestamp()
            });
          }
        }

        // 4. Update the order status
        transaction.update(orderRef, {
          status: 'voided',
          voidedAt: serverTimestamp()
        });
      });

      console.log("Order voided and stock restored: ", order.id);
    } catch (error) {
      console.error("Error voiding order: ", error);
      throw error;
    }
  },

  /**
   * Process a partial refund for specific items in an order
   * @param {Object} order - The original order object
   * @param {Array} refundItems - Array of items being refunded: [{ id, quantity, price, name }]
   * @param {Number} refundAmount - Total money being refunded
   */
  refundOrder: async (order, refundItems, refundAmount) => {
    try {
      const { runTransaction, doc, collection, serverTimestamp, increment } = await import('firebase/firestore');

      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, ORDERS_COLLECTION, order.id);
        const orderSnap = await transaction.get(orderRef);
        const current = orderSnap.data();

        if (current.status === 'voided') throw new Error('Cannot refund a voided order.');

        // Restore stock for refunded items
        for (const item of refundItems) {
          if (item.isBundle && item.bundleItems && Array.isArray(item.bundleItems)) {
            for (const component of item.bundleItems) {
              const compRef = doc(db, 'products', component.productId);
              const qtyToRestore = (component.quantity || 1) * (item.quantity || 1);
              transaction.update(compRef, {
                stock: increment(qtyToRestore),
                updatedAt: serverTimestamp(),
              });
              const logRef = doc(collection(db, 'inventoryLogs'));
              transaction.set(logRef, {
                productId: component.productId,
                change: qtyToRestore,
                reason: 'bundle_refund',
                orderId: order.id,
                timestamp: serverTimestamp(),
              });
            }
          } else {
            const productRef = doc(db, 'products', item.id);
            transaction.update(productRef, {
              stock: increment(item.quantity || 1),
              updatedAt: serverTimestamp(),
            });
            const logRef = doc(collection(db, 'inventoryLogs'));
            transaction.set(logRef, {
              productId: item.id,
              change: item.quantity || 1,
              reason: 'refund',
              orderId: order.id,
              timestamp: serverTimestamp(),
            });
          }
        }

        const existingRefunds = current.refunds || [];
        transaction.update(orderRef, {
          status: 'refunded',
          refunds: [...existingRefunds, {
            items: refundItems,
            amount: refundAmount,
            refundedAt: new Date().toISOString(),
          }],
          refundedAmount: (current.refundedAmount || 0) + refundAmount,
          updatedAt: serverTimestamp(),
        });
      });

      console.log('Refund processed for order:', order.id);
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  },

  /**
   * Export orders to CSV string
   */
  exportToCSV: (orders) => {
    const headers = ['Order ID', 'Date', 'Cashier', 'Payment Method', 'Items', 'Subtotal', 'Tax', 'Total', 'Status'];
    const rows = orders.map(o => [
      `#${o.id.slice(-6).toUpperCase()}`,
      o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'N/A',
      o.cashierName || 'System',
      o.paymentMethod || 'cash',
      (o.items || []).map(i => `${i.name}x${i.quantity}`).join('; '),
      (o.subTotal || 0).toFixed(2),
      (o.tax || 0).toFixed(2),
      (o.totalAmount || 0).toFixed(2),
      o.status || 'completed',
    ]);
    return [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  },

  /**
   * Export orders to CSV file and share/save via native OS modal
   */
  exportAndShareCSV: async (orders) => {
    try {
      const csvString = orderService.exportToCSV(orders);
      const FileSystem = await import('expo-file-system');
      const Sharing = await import('expo-sharing');
      
      const filename = `xpos_sales_export_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Sales Data',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        console.warn('Sharing is not available on this device');
      }
    } catch (e) {
      console.error('Error sharing CSV:', e);
      throw e;
    }
  },
};
