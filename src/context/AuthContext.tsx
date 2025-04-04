import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "@/integrations/firebase/client";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  browserPopupRedirectResolver
} from "firebase/auth";

interface AuthContextType {
  user: any;
  isAuthLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Handle redirect result from Google sign-in
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        setIsAuthLoading(true);
        // Check if we have a redirect result
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log("Redirect authentication successful:", result.user.email);
        }
      } catch (error: any) {
        console.error("Error with redirect sign-in:", error);
        // Store the error so we can display it to the user
        setAuthError(error.message || "Failed to complete authentication");
      } finally {
        setIsAuthLoading(false);
      }
    };

    handleRedirectResult();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error.message || "Failed to login");
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Signup error:", error);
      setAuthError(error.message || "Failed to sign up");
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Try using popup with a custom resolver which may help with COOP issues
      await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setAuthError(error.message || "Failed to sign in with Google");
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Logout error:", error);
      setAuthError(error.message || "Failed to log out");
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthLoading, 
      authError,
      login, 
      signup, 
      signInWithGoogle, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};