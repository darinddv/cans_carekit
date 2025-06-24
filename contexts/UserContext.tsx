import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { SupabaseService, UserProfile } from '@/lib/supabaseService';
import { supabase } from '@/lib/supabase';

interface UserContextType {
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent multiple concurrent operations
  const isLoadingRef = useRef(false);
  const hasInitialized = useRef(false);

  const clearError = () => setError(null);

  const loadUserProfile = async (): Promise<void> => {
    if (isLoadingRef.current) {
      console.log('Profile load already in progress, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      console.log('Loading user profile...');
      
      const profile = await SupabaseService.getCurrentUserProfile();
      
      if (profile) {
        console.log('Profile loaded:', profile.email);
        setUserProfile(profile);
        setIsAuthenticated(true);
        setError(null);
      } else {
        console.log('No profile found');
        setUserProfile(null);
        setIsAuthenticated(false);
      }
    } catch (err: any) {
      console.error('Error loading profile:', err.message);
      
      if (err.message?.includes('Auth session missing')) {
        setIsAuthenticated(false);
        setUserProfile(null);
        setError(null);
      } else {
        setError(err.message || 'Failed to load profile');
        setIsAuthenticated(false);
        setUserProfile(null);
      }
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    console.log('Refreshing profile...');
    setIsLoading(true);
    await loadUserProfile();
  };

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    console.log('Initializing UserContext...');

    const initializeAuth = async () => {
      try {
        // Check initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Initial session found');
          await loadUserProfile();
        } else {
          console.log('No initial session');
          setIsAuthenticated(false);
          setUserProfile(null);
          setIsLoading(false);
        }

        // Set up auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth event:', event, !!session);
            
            switch (event) {
              case 'SIGNED_IN':
                if (session) {
                  setIsLoading(true);
                  await loadUserProfile();
                }
                break;
                
              case 'SIGNED_OUT':
                setIsAuthenticated(false);
                setUserProfile(null);
                setError(null);
                setIsLoading(false);
                break;
                
              case 'TOKEN_REFRESHED':
                // Don't reload profile on token refresh if we already have one
                if (session && !userProfile) {
                  await loadUserProfile();
                }
                break;
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        setError(err.message || 'Failed to initialize');
        setIsLoading(false);
      }
    };

    const cleanup = initializeAuth();
    
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, []); // Only run once

  const value: UserContextType = {
    userProfile,
    isLoading,
    isAuthenticated,
    error,
    refreshProfile,
    clearError,
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