import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_COLLECTION = 'settings';
const BUSINESS_DOC_ID = 'businessProfile';

export const settingsService = {
  /**
   * Get the business profile settings
   */
  getSettings: async () => {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, BUSINESS_DOC_ID);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return {
        storeName: "xPOS Retail Store",
        address: "123 Business Avenue, Suite 100",
        phone: "+1 (555) 000-0000",
        website: "www.xpos.com",
        taxRate: 5.0,
        currency: "$",
        logoText: "xPOS"
      };
    } catch (error) {
      console.error("Error fetching settings:", error);
      // Graceful fallback for offline or missing documents
      return {
        storeName: "xPOS Retail Store (Offline)",
        address: "Offline Mode",
        phone: "N/A",
        website: "N/A",
        taxRate: 5.0,
        currency: "$",
        logoText: "xPOS"
      };
    }
  },

  /**
   * Update the business profile settings
   * @param {Object} updates 
   */
  updateSettings: async (updates) => {
    console.time('Firestore:UpdateSettings');
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, BUSINESS_DOC_ID);
      await setDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.timeEnd('Firestore:UpdateSettings');
    } catch (error) {
      console.timeEnd('Firestore:UpdateSettings');
      console.error("Error updating settings:", error);
      throw error;
    }
  }
};
