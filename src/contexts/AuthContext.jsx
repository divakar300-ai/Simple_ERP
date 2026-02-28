import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Persist auth state on app load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setError(null);

      if (currentUser) {
        setUser(currentUser);

        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole((userData.role || 'employee').toLowerCase());
            setUserDisplayName(userData.displayName || currentUser.email);
          } else {
            setUserRole('employee');
            setUserDisplayName(currentUser.email);
          }
        } catch (err) {
          console.error('Error fetching user role:', err);
          setUserRole('employee');
          setUserDisplayName(currentUser.email);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setUserDisplayName('');
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /**
   * Map Firebase error codes to user-friendly messages
   */
  const mapFirebaseError = (err) => {
    const errorMap = {
      'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/user-disabled': 'This account has been disabled.',
    };
    return errorMap[err.code] || err.message || 'An unexpected error occurred.';
  };

  /**
   * Register a new user — throws on error so Login component can catch it
   */
  const register = async (email, password, displayName, role = 'employee') => {
    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      const normalizedRole = (role || 'employee').toLowerCase();

      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: email,
        displayName: displayName,
        role: normalizedRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setUser(newUser);
      setUserRole(normalizedRole);
      setUserDisplayName(displayName);
    } catch (err) {
      console.error('Registration error:', err);
      const message = mapFirebaseError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user — throws on error so Login component can catch it
   */
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const currentUser = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole((userData.role || 'employee').toLowerCase());
        setUserDisplayName(userData.displayName || currentUser.email);
      } else {
        setUserRole('employee');
        setUserDisplayName(currentUser.email);
      }

      setUser(currentUser);
    } catch (err) {
      console.error('Login error:', err);
      const message = mapFirebaseError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout the current user
   */
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserRole(null);
      setUserDisplayName('');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const value = {
    user,
    userRole,
    userDisplayName,
    loading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
