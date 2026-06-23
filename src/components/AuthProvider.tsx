import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { safeSessionStorage } from '../lib/safeStorage';
import { LogOut, ShieldAlert, Cpu } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  isAllowed: boolean;
  isAdmin: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const SUPER_ADMINS = [
  "anu007lko@gmail.com",
  "admin@example.com"
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const email = currentUser.email || '';
          const uid = currentUser.uid;
          
          // Check local cache first to minimize Firestore reads
          const cacheKeyAllowed = `auth_allowed_${uid}`;
          const cacheKeyAdmin = `auth_admin_${uid}`;
          const cachedAllowed = safeSessionStorage.getItem(cacheKeyAllowed);
          const cachedAdmin = safeSessionStorage.getItem(cacheKeyAdmin);

          if (cachedAllowed !== null && cachedAdmin !== null) {
            setIsAllowed(cachedAllowed === 'true');
            setIsAdmin(cachedAdmin === 'true');
            setLoading(false);
            return;
          }

          let userIsAdmin = false;
          let userIsAllowed = false;

          // Check if email falls under hardcoded super administrators
          if (SUPER_ADMINS.includes(email)) {
            userIsAdmin = true;
            userIsAllowed = true;
          } else {
            // Check admins collection in Firestore
            try {
              const path = `admins/${uid}`;
              const adminDoc = await getDoc(doc(db, path));
              if (adminDoc.exists()) {
                userIsAdmin = true;
                userIsAllowed = true;
              }
            } catch (e) {
              console.warn("User is not an admin via DB");
            }
          }

          setIsAdmin(userIsAdmin);

          if (!userIsAllowed) {
            // Check allowed users collection in Firestore
            try {
              const path = `allowedUsers/${email}`;
              const allowDoc = await getDoc(doc(db, path));
              if (allowDoc.exists()) {
                userIsAllowed = true;
              }
            } catch (e) {
              console.warn("Not explicitly allowed or getDoc failed", e);
              // Graceful offline fallback: if we cannot contact Firestore, fall back safely if we had a key,
              // but standard security restricts access unless explicitly in SUPER_ADMINS or pre-cached.
            }
          }

          setIsAllowed(userIsAllowed);

          // Write back to sessionStorage to eliminate reads on page reload in the same tab
          safeSessionStorage.setItem(cacheKeyAllowed, String(userIsAllowed));
          safeSessionStorage.setItem(cacheKeyAdmin, String(userIsAdmin));
          
        } catch (error) {
          console.error("Error fetching access info:", error);
          setIsAllowed(false);
          setIsAdmin(false);
        }
      } else {
        setIsAllowed(false);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const logOut = async () => {
    try {
      safeSessionStorage.clear();
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="font-mono text-sm tracking-widest text-slate-500 uppercase">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-indigo-100">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 space-y-8 text-center animate-fade-in relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          
          <div className="mx-auto w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center rotate-3 shadow-inner">
            <Cpu className="w-8 h-8 text-indigo-600 -rotate-3" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Secure Access Portal</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Authenticate via Google Workspace to access the AI Sourcing Assistant. Access is strictly governed by admin provisioned accounts.
            </p>
          </div>
          
          <div className="pt-4">
            <button
              onClick={signIn}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-700 transition-all duration-300 py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>
          </div>
          
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 font-semibold pt-4">
            Zero-Trust Network Access
          </p>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-rose-200/50 p-8 space-y-8 text-center animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
          
          <div className="mx-auto w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Access Denied</h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              The account <strong className="font-semibold text-slate-900">{user.email}</strong> is not authorized to access this environment. Please contact your system administrator to provision access.
            </p>
          </div>
          
          <button
            onClick={logOut}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white transition-colors duration-300 py-3 rounded-xl font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAllowed, isAdmin, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};
