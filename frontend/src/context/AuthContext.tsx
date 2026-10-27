import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClerkProvider, useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { api } from '../services/api';

const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  'pk_test_cGVyZmVjdC1kb3J5LTYwNTkuY2xlcmsuYWNjb3VudHMuZGV2JA';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  imageUrl?: string;
  role?: string;
}

export interface RecentAccount {
  id: string;
  fullName: string;
  email: string;
  imageUrl?: string;
  lastSignedInAt: number;
}

export interface AuthContextType {
  user: AuthUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  signOut: () => Promise<void>;
  recentAccounts: RecentAccount[];
  removeRecentAccount: (id: string) => void;
  openUserProfile?: () => void;
  isClerkEnabled: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isSignedIn: false,
  isLoaded: false,
  signOut: async () => {},
  recentAccounts: [],
  removeRecentAccount: () => {},
  isClerkEnabled: true,
});

export const useAppAuth = () => useContext(AuthContext);

const RECENT_ACCOUNTS_KEY = 'cognivault_recent_accounts';

// Clerk Auth Bridge Component
const ClerkAuthBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const { getToken, signOut: clerkSignOut } = useAuth();
  const clerk = useClerk();

  const [recentAccounts, setRecentAccounts] = useState<RecentAccount[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_ACCOUNTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      getToken().then((token) => {
        api.setToken(token);
      });
      api.setDevUserId(clerkUser.id);

      // Save to recent accounts list for logout recommendation
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const fullName = clerkUser.fullName || clerkUser.firstName || clerkUser.username || 'User';
      const account: RecentAccount = {
        id: clerkUser.id,
        fullName,
        email,
        imageUrl: clerkUser.imageUrl,
        lastSignedInAt: Date.now(),
      };

      setRecentAccounts((prev) => {
        const filtered = prev.filter((a) => a.id !== clerkUser.id && a.email !== email);
        const updated = [account, ...filtered].slice(0, 5);
        try {
          localStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save recent account', e);
        }
        return updated;
      });
    } else if (isLoaded && !isSignedIn) {
      api.setToken(null);
      api.setDevUserId('');
    }
  }, [isLoaded, isSignedIn, clerkUser, getToken]);

  const handleSignOut = async () => {
    try {
      await clerkSignOut();
      api.setToken(null);
      api.setDevUserId('');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const removeRecentAccount = (id: string) => {
    setRecentAccounts((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update recent accounts', e);
      }
      return updated;
    });
  };

  const user: AuthUser | null = clerkUser
    ? {
        id: clerkUser.id,
        fullName: clerkUser.fullName || clerkUser.firstName || clerkUser.username || 'User',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        imageUrl: clerkUser.imageUrl,
        role: 'Verified Member',
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn: !!isSignedIn,
        isLoaded,
        signOut: handleSignOut,
        recentAccounts,
        removeRecentAccount,
        openUserProfile: () => clerk.openUserProfile?.(),
        isClerkEnabled: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#F5B544',
          colorBackground: '#171521',
          colorInputBackground: '#100F17',
          colorInputText: '#F5F3FA',
          colorText: '#F5F3FA',
          colorTextSecondary: '#A6A0B5',
          colorDanger: '#FB7185',
        },
        elements: {
          card: 'bg-[#171521] border border-[#302B3D] shadow-2xl rounded-2xl',
          headerTitle: 'text-[#F5F3FA] font-bold text-lg',
          headerSubtitle: 'text-[#A6A0B5] text-xs',
          formButtonPrimary:
            'bg-[#F5B544] hover:bg-[#E9A72D] text-[#0B0A10] font-semibold transition-all duration-150 shadow-md',
          socialButtonsBlockButton:
            'bg-[#201D2B] border border-[#302B3D] hover:bg-[#282436] text-[#F5F3FA]',
          formFieldInput:
            'bg-[#100F17] border-[#302B3D] focus:border-[#A78BFA] text-[#F5F3FA]',
          footerActionLink: 'text-[#A78BFA] hover:text-[#C4B5FD] font-medium',
          dividerLine: 'bg-[#302B3D]',
          dividerText: 'text-[#A6A0B5] text-xs',
        },
      }}
    >
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
};
