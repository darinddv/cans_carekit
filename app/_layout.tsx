import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { UserProvider, useUser } from '@/contexts/UserContext';

// Main app content that uses the UserContext
function AppContent() {
  const { userProfile, isLoading, isAuthenticated, error } = useUser();
  const [navigationState, setNavigationState] = useState<'pending' | 'navigated'>('pending');

  useEffect(() => {
    // Don't navigate until we're done loading
    if (isLoading) {
      setNavigationState('pending');
      return;
    }

    // Only navigate once per auth state change
    if (navigationState === 'navigated') {
      return;
    }

    console.log('Navigation decision:', { 
      isAuthenticated, 
      hasProfile: !!userProfile, 
      error: !!error,
      navigationState 
    });

    try {
      if (isAuthenticated && userProfile) {
        console.log('Navigating to tabs - user authenticated with profile');
        router.replace('/(tabs)');
        setNavigationState('navigated');
      } else if (!isAuthenticated) {
        console.log('Navigating to login - user not authenticated');
        router.replace('/login');
        setNavigationState('navigated');
      } else if (isAuthenticated && !userProfile && !error) {
        // User is authenticated but no profile - wait for profile creation
        console.log('User authenticated but no profile found - waiting...');
        // Don't navigate yet, stay in loading state
      } else if (error) {
        console.log('Navigation with error state - going to login');
        router.replace('/login');
        setNavigationState('navigated');
      }
    } catch (navError) {
      console.error('Navigation error:', navError);
      router.replace('/login');
      setNavigationState('navigated');
    }
  }, [isLoading, isAuthenticated, userProfile, error, navigationState]);

  // Reset navigation state when auth state changes significantly
  useEffect(() => {
    setNavigationState('pending');
  }, [isAuthenticated]);

  // Show loading screen while determining auth state
  if (isLoading || navigationState === 'pending') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
        {Platform.OS === 'web' && (
          <Text style={styles.loadingSubtext}>
            Checking authentication status
          </Text>
        )}
      </View>
    );
  }

  // Show error state if there's a persistent error
  if (error && !isAuthenticated) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorSubtext}>
          Please check your internet connection and try again.
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <UserProvider>
      <AppContent />
      <StatusBar style="auto" />
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});