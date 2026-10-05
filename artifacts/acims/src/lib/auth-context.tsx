import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, googleAuthProvider } from './firebase';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, type User } from 'firebase/auth';

export type UserRole = 'STUDENT' | 'DRIVER' | 'ADMIN' | 'PARENT';

export interface UserProfile {
  id: number;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  assignedBusId?: string | null;
  assignedRouteId?: string | null;
  pickupStopId?: string | null;
  registerNumber?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  token: string | null;
  signInWithGoogle: (preferredRole?: UserRole) => Promise<UserProfile | null>;
  signInWithCampusId: (rollOrId: string, role?: UserRole) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  token: null,
  signInWithGoogle: async () => null,
  signInWithCampusId: async () => null,
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('acmis_user_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('acmis_id_token') || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = async (idToken: string, userPayload: { uid: string; email: string; name?: string; role?: UserRole }) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(userPayload),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        localStorage.setItem('acmis_user_profile', JSON.stringify(data.profile));
        return data.profile as UserProfile;
      }
    } catch (err) {
      console.error('Failed to sync user profile with backend:', err);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken();
          setToken(idToken);
          sessionStorage.setItem('acmis_id_token', idToken);
          await fetchOrCreateProfile(idToken, {
            uid: currentUser.uid,
            email: currentUser.email || `${currentUser.uid}@rec.campus.local`,
            name: currentUser.displayName || 'Campus User',
          });
        } catch (e) {
          console.error('Error fetching token:', e);
        }
      } else {
        // If not signed in via Google, check for local campus profile
        const localProf = localStorage.getItem('acmis_user_profile');
        if (localProf) {
          try {
            setProfile(JSON.parse(localProf));
          } catch {}
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (preferredRole: UserRole = 'STUDENT') => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      setToken(idToken);
      sessionStorage.setItem('acmis_id_token', idToken);

      const p = await fetchOrCreateProfile(idToken, {
        uid: result.user.uid,
        email: result.user.email || `${result.user.uid}@rec.campus.local`,
        name: result.user.displayName || 'Campus User',
        role: preferredRole,
      });
      return p;
    } catch (err) {
      console.error('Google sign-in error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithCampusId = async (rollOrId: string, role: UserRole = 'STUDENT') => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/campus-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: rollOrId, role }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        localStorage.setItem('acmis_user_profile', JSON.stringify(data.profile));
        if (data.token) {
          setToken(data.token);
          sessionStorage.setItem('acmis_id_token', data.token);
        }
        return data.profile as UserProfile;
      }
    } catch (err) {
      console.error('Campus ID sign in failed:', err);
    } finally {
      setLoading(false);
    }
    return null;
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch {}
    setUser(null);
    setProfile(null);
    setToken(null);
    localStorage.removeItem('acmis_user_profile');
    sessionStorage.removeItem('acmis_id_token');
    sessionStorage.removeItem('acmis_student_logged_in');
    sessionStorage.removeItem('acmis_admin_authenticated');
  };

  const refreshProfile = async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/auth/profile/${profile.userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        localStorage.setItem('acmis_user_profile', JSON.stringify(data.profile));
      }
    } catch (err) {
      console.error('Profile refresh error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        token,
        signInWithGoogle,
        signInWithCampusId,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
