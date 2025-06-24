import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupabaseService, UserProfile } from '@/lib/supabaseService';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

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
  const [isInitialized, setIsInitialized] = useState(false);

  // Clear error function
  const clearError = () => setError(null);

  // Load user profile with comprehensive error handling
  const loadUserProfile = async (retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s

    try {
      console.log(`Loading user profile (attempt ${retryCount + 1}/${maxRetries + 1})`);
      setIsLoading(true);
      setError(null);

      // Check if user is authenticated first
      const isAuth = await SupabaseService.isAuthenticated();
      setIsAuthenticated(isAuth);

      if (!isAuth) {
        console.log('User not authenticated, clearing profile');
        setUserProfile(null);
        setIsLoading(false);
        return;
      }

      // Get user profile
      const profile = await SupabaseService.getCurrentUserProfile();
      
      if (profile) {
        console.log('User profile loaded successfully:', profile.email);
        setUserProfile(profile);
        setError(null);
      } else {
        console.log('No user profile found');
        setUserProfile(null);
        // Don't set this as an error - user might not have a profile yet
      }

    } catch (err: any) {
      console.error(`Error loading user profile (attempt ${retryCount + 1}):`, err);
      
      // Handle specific error types
      if (err.message?.includes('Auth session missing') || err.name === 'AuthSessionMissingError') {
        console.log('Auth session missing, user is not authenticated');
        setIsAuthenticated(false);
        setUserProfile(null);
        setError(null); // Don't treat this as an error
      } else if (err.message?.includes('timed out') && retryCount < maxRetries) {
        // Retry on timeout
        console.log(`Retrying after ${retryDelay}ms...`);
        setTimeout(() => {
          loadUserProfile(retryCount + 1);
        }, retryDelay);
        return; // Don't set loading to false yet
      } else {
        // Set error for other types of failures
        const errorMessage = err.message || 'Failed to load user profile';
        setError(errorMessage);
        setUserProfile(null);
        
        // On web, be more lenient with errors to avoid blocking the UI
        if (Platform.OS === 'web' && retryCount < maxRetries) {
          console.log(`Web platform: retrying after ${retryDelay}ms...`);
          setTimeout(() => {
            loadUserProfile(retryCount + 1);
          }, retryDelay);
          return;
        }
      }
    } finally {
      setIsLoading(false);
      if (!isInitialized) {
        setIsInitialized(true);
      }
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    await loadUserProfile();
  };

  // Initialize and set up auth state listener
  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...');
        
        // Check initial session with timeout
        const sessionCheckPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 10000);
        });

        try {
          const { data: { session }, error } = await Promise.race([
            sessionCheckPromise,
            timeoutPromise
          ]) as any;

          if (mounted) {
            if (error) {
              console.error('Error getting initial session:', error);
              setIsAuthenticated(false);
              setUserProfile(null);
            } else if (session) {
              console.log('Initial session found, loading profile...');
              setIsAuthenticated(true);
              await loadUserProfile();
            } else {
              console.log('No initial session found');
              setIsAuthenticated(false);
              setUserProfile(null);
              setIsLoading(false);
              setIsInitialized(true);
            }
          }
        } catch (sessionError) {
          console.warn('Session check failed or timed out:', sessionError);
          if (mounted) {
            setIsAuthenticated(false);
            setUserProfile(null);
            setIsLoading(false);
            setIsInitialized(true);
          }
        }

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;

            console.log('Auth state changed:', event, !!session);
            
            try {
              switch (event) {
                case 'SIGNED_IN':
                  if (session) {
                    console.log('User signed in, loading profile...');
                    setIsAuthenticated(true);
                    await loadUserProfile();
                  }
                  break;
                  
                case 'SIGNED_OUT':
                  console.log('User signed out, clearing profile...');
                  setIsAuthenticated(false);
                  setUserProfile(null);
                  setError(null);
                  setIsLoading(false);
                  break;
                  
                case 'TOKEN_REFRESHED':
                  console.log('Token refreshed');
                  if (session) {
                    setIsAuthenticated(true);
                    // Don't reload profile on token refresh unless we don't have one
                    if (!userProfile) {
                      await loadUserProfile();
                    }
                  }
                  break;
                  
                case 'USER_UPDATED':
                  console.log('User updated, refreshing profile...');
                  if (session) {
                    setIsAuthenticated(true);
                    await loadUserProfile();
                  }
                  break;
                  
                default:
                  console.log('Unhandled auth event:', event);
                  break;
              }
            } catch (authError) {
              console.error('Error handling auth state change:', authError);
              if (mounted) {
                setError('Authentication error occurred');
              }
            }
          }
        );

        authSubscription = subscription;

      } catch (initError) {
        console.error('Error initializing auth:', initError);
        if (mounted) {
          setError('Failed to initialize authentication');
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      mounted = false;
      if (authSubscription) {
        console.log('Cleaning up auth subscription');
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // Handle visibility change for web platform
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && !userProfile && !isLoading) {
        console.log('Page became visible, checking auth state...');
        // Small delay to avoid race conditions
        setTimeout(() => {
          refreshProfile();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, userProfile, isLoading]);

  const value: UserContextType = {
    userProfile,
    isLoading: isLoading || !isInitialized,
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