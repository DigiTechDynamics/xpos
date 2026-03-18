import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { inventoryService } from './inventoryService';

const PRODUCTS_COLLECTION = 'products';

export const productService = {
  /**
   * Listen to real-time updates for products
   * @param {function} callback - Function called with updated products list
   */
  subscribeToProducts: (callback) => {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(products);
    }, (error) => {
      console.error("Error subscribing to products:", error);
    });
  },

  /**
   * Seed the database with initial retail items
   * @param {Array} initialProducts - Array of product objects
   */
  seedProducts: async (initialProducts) => {
    try {
      for (const product of initialProducts) {
        await addDoc(collection(db, PRODUCTS_COLLECTION), {
          ...product,
          createdAt: serverTimestamp()
        });
      }
      console.log("Database seeded successfully");
    } catch (error) {
      console.error("Error seeding database:", error);
    }
  },

  /**
   * Update an existing product
   * @param {string} id - Product ID
   * @param {Object} updates - Fields to update
   */
  updateProduct: async (id, updates) => {
    try {
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      
      // If stock is being updated directly, log it
      if (updates.stock !== undefined) {
        // We'd ideally need the old stock to log the change, 
        // but for now we'll just log that an update happened.
        // A better way is using adjustStock.
        await inventoryService.logStockMovement(id, 0, 'manual_update');
      }

      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  },

  /**
   * Adjust stock level and log the movement
   * @param {string} productId 
   * @param {number} amount - Positive for restock, negative for deduction
   * @param {string} reason 
   */
  adjustStock: async (productId, amount, reason) => {
    try {
      const docRef = doc(db, PRODUCTS_COLLECTION, productId);
      
      // We use a transaction or atomic increment for stock consistency
      // For now, let's use the update with increment if available in this firebase version,
      // or just fetch and update. 
      // Using increment is safer.
      const { increment } = await import('firebase/firestore');
      
      await updateDoc(docRef, {
        stock: increment(amount),
        updatedAt: serverTimestamp()
      });

      await inventoryService.logStockMovement(productId, amount, reason);
    } catch (error) {
      console.error("Error adjusting stock:", error);
      throw error;
    }
  },

  /**
   * Add a single new product
   * @param {Object} product - Product details
   */
  addProduct: async (product) => {
    try {
      const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), {
        ...product,
        createdAt: serverTimestamp()
      });
      
      // Log initial stock if provided
      if (product.stock > 0) {
        await inventoryService.logStockMovement(docRef.id, product.stock, 'initial_stock');
      }
      
      return docRef.id;
    } catch (error) {
      console.error("Error adding product:", error);
      throw error;
    }
  },

  /**
   * Delete a product
   * @param {string} id - Product ID
   */
  deleteProduct: async (id) => {
    try {
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }
};
