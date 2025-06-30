import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  DancingScript_400Regular,
  DancingScript_700Bold,
} from '@expo-google-fonts/dancing-script';

function AppContent() {
  const { userProfile, isLoading, isAuthenticated, error } = useUser();
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    // Don't navigate while loading
    if (isLoading) {
      return;
    }

    // Prevent multiple navigation attempts
    if (hasNavigated) {
      return;
    }

    console.log('Navigation check:', { isAuthenticated, hasProfile: !!userProfile, error: !!error });

    try {
      if (isAuthenticated && userProfile) {
        console.log('Navigating to tabs');
        router.replace('/(tabs)');
        setHasNavigated(true);
      } else if (!isAuthenticated || error) {
        console.log('Navigating to login');
        router.replace('/login');
        setHasNavigated(true);
      }
      // If authenticated but no profile, wait for profile to load
    } catch (navError) {
      console.error('Navigation error:', navError);
      router.replace('/login');
      setHasNavigated(true);
    }
  }, [isLoading, isAuthenticated, userProfile, error, hasNavigated]);

  // Reset navigation flag when auth state changes
  useEffect(() => {
    setHasNavigated(false);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
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

  // Load fonts at the root level
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'DancingScript-Regular': DancingScript_400Regular,
    'DancingScript-Bold': DancingScript_700Bold,
  });

  // Don't render the app until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.fontLoadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.fontLoadingText}>Loading fonts...</Text>
      </View>
    );
  }

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
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  fontLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  fontLoadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
});