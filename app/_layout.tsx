import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check initial session
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authenticated = !!session;
        
        if (isMounted) {
          setIsAuthenticated(authenticated);
          setIsLoading(false);
          
          // Only navigate on initial load based on auth status
          if (authenticated) {
            router.replace('/(tabs)');
          } else {
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error('Error checking initial session:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
          router.replace('/login');
        }
      }
    };

    checkInitialSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Listen for auth changes, but only navigate when authentication status actually changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, !!session);
        
        const authenticated = !!session;
        
        // Only navigate if the authentication status has actually changed
        if (authenticated !== isAuthenticated) {
          setIsAuthenticated(authenticated);
          
          if (authenticated) {
            router.replace('/(tabs)');
          } else {
            router.replace('/login');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated]); // Depend on isAuthenticated to compare against current state

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
});