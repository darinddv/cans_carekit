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

  // Load user profile with comprehensive error handling and detailed logging
  const loadUserProfile = async (): Promise<void> => {
    try {
      console.log('=== LOADING USER PROFILE ===');
      setIsLoading(true);
      setError(null);

      // Check if user is authenticated first
      console.log('Step 1: Checking authentication...');
      const isAuth = await SupabaseService.isAuthenticated();
      console.log('Authentication result:', isAuth);
      setIsAuthenticated(isAuth);

      if (!isAuth) {
        console.log('User not authenticated, clearing profile');
        setUserProfile(null);
        setIsLoading(false);
        return;
      }

      // Get user profile
      console.log('Step 2: Getting user profile...');
      const profile = await SupabaseService.getCurrentUserProfile();
      
      if (profile) {
        console.log('User profile loaded successfully:', {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          created_at: profile.created_at
        });
        setUserProfile(profile);
        setError(null);
      } else {
        console.log('No user profile found');
        setUserProfile(null);
        // Don't set this as an error - user might not have a profile yet
      }

    } catch (err: any) {
      console.error('=== ERROR LOADING USER PROFILE ===');
      console.error('Error type:', typeof err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error status:', err.status);
      console.error('Error code:', err.code);
      console.error('Error details:', err.details);
      console.error('Error hint:', err.hint);
      console.error('Full error object:', err);
      console.error('Error stack:', err.stack);
      
      // Handle specific error types
      if (err.message?.includes('Auth session missing') || err.name === 'AuthSessionMissingError') {
        console.log('Auth session missing, user is not authenticated');
        setIsAuthenticated(false);
        setUserProfile(null);
        setError(null); // Don't treat this as an error
      } else {
        // Set error for other types of failures
        const errorMessage = err.message || 'Failed to load user profile';
        console.error('Setting error state:', errorMessage);
        setError(errorMessage);
        setUserProfile(null);
      }
    } finally {
      console.log('=== FINISHED LOADING USER PROFILE ===');
      setIsLoading(false);
      if (!isInitialized) {
        setIsInitialized(true);
      }
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    console.log('=== REFRESH PROFILE REQUESTED ===');
    await loadUserProfile();
  };

  // Initialize and set up auth state listener
  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        console.log('=== INITIALIZING AUTHENTICATION ===');
        
        // Check initial session without timeout to see raw errors
        console.log('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (mounted) {
          if (error) {
            console.error('=== INITIAL SESSION ERROR ===');
            console.error('Error type:', typeof error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error status:', error.status);
            console.error('Full error object:', error);
            setIsAuthenticated(false);
            setUserProfile(null);
            setError(`Session error: ${error.message}`);
          } else if (session) {
            console.log('Initial session found:', {
              user_id: session.user?.id,
              email: session.user?.email,
              expires_at: session.expires_at,
              access_token: session.access_token ? 'present' : 'missing',
              refresh_token: session.refresh_token ? 'present' : 'missing'
            });
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

        // Set up auth state change listener
        console.log('Setting up auth state change listener...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;

            console.log('=== AUTH STATE CHANGE ===');
            console.log('Event:', event);
            console.log('Session present:', !!session);
            if (session) {
              console.log('Session details:', {
                user_id: session.user?.id,
                email: session.user?.email,
                expires_at: session.expires_at
              });
            }
            
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
              console.error('=== AUTH STATE CHANGE ERROR ===');
              console.error('Error handling auth state change:', authError);
              if (mounted) {
                setError(`Authentication error: ${authError}`);
              }
            }
          }
        );

        authSubscription = subscription;

      } catch (initError) {
        console.error('=== INITIALIZATION ERROR ===');
        console.error('Error type:', typeof initError);
        console.error('Error name:', (initError as any).name);
        console.error('Error message:', (initError as any).message);
        console.error('Full error object:', initError);
        if (mounted) {
          setError(`Failed to initialize authentication: ${initError}`);
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
        console.log('=== PAGE BECAME VISIBLE ===');
        console.log('Checking auth state after visibility change...');
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