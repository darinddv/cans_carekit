import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupabaseService, UserProfile } from '@/lib/supabaseService';
import { supabase } from '@/lib/supabase';

interface UserContextType {
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const profile = await SupabaseService.getCurrentUserProfile();
      setUserProfile(profile);
    } catch (err: any) {
      console.error('Error loading user profile:', err);
      setError(err.message || 'Failed to load user profile');
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    await loadUserProfile();
  };

  useEffect(() => {
    // Load initial profile
    loadUserProfile();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed in UserContext:', event, !!session);
        
        if (session) {
          // User signed in - load their profile
          await loadUserProfile();
        } else {
          // User signed out - clear profile
          setUserProfile(null);
          setIsLoading(false);
          setError(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: UserContextType = {
    userProfile,
    isLoading,
    error,
    refreshProfile,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}