'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Process redirect results for mobile logins
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        try {
          const userRef = doc(db, 'users', result.user.uid);
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: result.user.uid,
              email: result.user.email,
              role: 'client',
              displayName: result.user.displayName || '',
              createdAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error('Error creating user doc from redirect:', e);
        }
      }
    }).catch((error) => {
      console.error('Redirect result error:', error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
      }

      try {
        const profileDoc = await getDoc(doc(db, 'users', nextUser.uid));
        if (!cancelled) {
          setProfile(profileDoc.data() || null);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching profile:', error);
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
