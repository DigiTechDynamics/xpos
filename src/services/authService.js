import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebase';

export const authService = {
  /**
   * Sign in with email and password
   */
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Login error:", error.code, error.message);
      throw error;
    }
  },

  /**
   * Sign out current user
   */
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error.message);
      throw error;
    }
  },
 
  /**
   * Send password reset email
   */
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Reset password error:", error.code, error.message);
      throw error;
    }
  },

  /**
   * Listen to auth state changes and inject role
   */
  subscribeToAuthChanges: (callback) => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const { doc, getDoc, setDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          let role = 'cashier';
          if (userSnap.exists()) {
            role = userSnap.data().role || 'cashier';
          } else {
            // New user registration flow
            const { getDocs, collection } = await import('firebase/firestore');
            const usersSnap = await getDocs(collection(db, 'users'));
            
            // If this is the first user ever, make them supervisor. 
            // Otherwise, check for 'admin'/'supervisor' in email or default to cashier.
            if (usersSnap.empty) {
              role = 'supervisor';
            } else {
              role = user.email?.toLowerCase().includes('admin') || user.email?.toLowerCase().includes('supervisor') 
                ? 'supervisor' 
                : 'cashier';
            }
            
            await setDoc(userRef, { email: user.email, role, createdAt: new Date() }, { merge: true });
          }
          
          callback({ ...user, role });
        } catch (error) {
          console.error("Error fetching user role:", error);
          callback({ ...user, role: 'cashier' }); // fallback
        }
      } else {
        callback(null);
      }
    });
  },

  /**
   * Get all users (Supervisors only)
   */
  getAllUsers: async () => {
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Update user role
   */
  updateUserRole: async (uid, role) => {
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await updateDoc(doc(db, 'users', uid), { role, updatedAt: new Date() });
  },

  /**
   * Toggle user account status
   */
  toggleUserStatus: async (uid, disabled) => {
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await updateDoc(doc(db, 'users', uid), { disabled, updatedAt: new Date() });
  }
};
