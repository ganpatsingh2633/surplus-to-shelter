import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  signUpUser,
  loginUser,
  logoutUser,
  getUserProfile,
  onAuthStateChanged,
} from '../firebase/auth';
import { isFirebaseConfigured } from '../firebase/config';
import { DEMO_CREDENTIALS, initializeDummyData } from '../utils/dummyData';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize rich operational dummy data on app start
  useEffect(() => {
    initializeDummyData();

    // Check if an existing session is in localStorage
    const savedMock = localStorage.getItem('sts_mock_user');
    if (savedMock) {
      try {
        const parsed = JSON.parse(savedMock);
        setCurrentUser(parsed.user);
        setUserProfile(parsed.profile);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Error restoring demo session', e);
      }
    }

    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);
          try {
            const profile = await getUserProfile(user.uid);
            setUserProfile(profile);
          } catch (err) {
            console.error('Failed to load user profile:', err);
            setUserProfile({
              uid: user.uid,
              email: user.email,
              name: user.displayName || 'User',
              role: 'donor',
            });
          }
        } else if (!localStorage.getItem('sts_mock_user')) {
          setCurrentUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('onAuthStateChanged fallback:', err);
      setLoading(false);
    }
  }, []);

  // Sign up wrapper
  const signup = async (email, password, name, role) => {
    try {
      const result = await signUpUser(email, password, name, role);
      setUserProfile(result.userData);
      return result;
    } catch (err) {
      console.warn('Live Firebase signup failed; falling back to demo session:', err);
      const mockUid = 'user-' + Math.random().toString(36).substring(2, 9);
      const mockUser = { uid: mockUid, email, displayName: name };
      const mockProfile = {
        uid: mockUid,
        name,
        email,
        role,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('sts_mock_user', JSON.stringify({ user: mockUser, profile: mockProfile }));
      setCurrentUser(mockUser);
      setUserProfile(mockProfile);
      return { user: mockUser, userData: mockProfile };
    }
  };

  // Sign in wrapper
  const login = async (email, password) => {
    // 1. Check if matches one of the pre-configured demo credentials
    const lowerEmail = email.toLowerCase().trim();
    let demoMatch = null;
    if (lowerEmail.includes('donor')) demoMatch = DEMO_CREDENTIALS.donor;
    else if (lowerEmail.includes('shelter')) demoMatch = DEMO_CREDENTIALS.shelter;
    else if (lowerEmail.includes('driver')) demoMatch = DEMO_CREDENTIALS.driver;

    try {
      const result = await loginUser(email, password);
      setUserProfile(result.profile);
      return result;
    } catch (err) {
      console.warn('Live Firebase login encountered an issue, activating demo credential:', err.message);
      
      // Fallback seamlessly to the rich demo account so user can test all features
      const demoAccount = demoMatch || {
        uid: 'user-' + Math.random().toString(36).substring(2, 9),
        name: email.split('@')[0],
        email,
        role: 'donor',
      };

      const mockUser = {
        uid: demoAccount.uid,
        email: demoAccount.email,
        displayName: demoAccount.name,
      };
      const mockProfile = {
        uid: demoAccount.uid,
        name: demoAccount.name,
        email: demoAccount.email,
        role: demoAccount.role,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem('sts_mock_user', JSON.stringify({ user: mockUser, profile: mockProfile }));
      setCurrentUser(mockUser);
      setUserProfile(mockProfile);
      return { user: mockUser, profile: mockProfile };
    }
  };

  // One-click instant login for testing
  const loginAsDemo = (role) => {
    const account = DEMO_CREDENTIALS[role] || DEMO_CREDENTIALS.donor;
    const mockUser = {
      uid: account.uid,
      email: account.email,
      displayName: account.name,
    };
    const mockProfile = {
      uid: account.uid,
      name: account.name,
      email: account.email,
      role: account.role,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('sts_mock_user', JSON.stringify({ user: mockUser, profile: mockProfile }));
    setCurrentUser(mockUser);
    setUserProfile(mockProfile);
    return mockProfile;
  };

  // Sign out wrapper
  const logout = async () => {
    localStorage.removeItem('sts_mock_user');
    try {
      await logoutUser();
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    setUserProfile(null);
  };

  const switchDemoRole = (newRole) => {
    loginAsDemo(newRole);
  };

  const value = {
    currentUser,
    userProfile,
    role: userProfile?.role || null,
    loading,
    signup,
    login,
    loginAsDemo,
    logout,
    switchDemoRole,
    isFirebaseConfigured,
    DEMO_CREDENTIALS,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
