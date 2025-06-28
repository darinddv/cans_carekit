import { Tabs } from 'expo-router';
import { Platform, Dimensions, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Heart, Activity, ChartBar as BarChart3, Users, Briefcase, User } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';

export default function TabLayout() {
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const { userProfile, isLoading } = useUser();

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  // Show loading screen while user profile is being fetched
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const isWeb = Platform.OS === 'web';
  const isTablet = windowWidth >= 768;
  const isDesktop = windowWidth >= 1024;

  // Determine which tabs to show based on user role
  const isProvider = userProfile?.role === 'provider';
  const isPatient = userProfile?.role === 'patient' || !userProfile?.role; // Default to patient if no role

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: isWeb ? 1 : 0.5,
          borderTopColor: '#E5E5EA',
          paddingTop: isWeb && isDesktop ? 12 : 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : isWeb && isDesktop ? 12 : 8,
          height: Platform.OS === 'ios' ? 88 : isWeb && isDesktop ? 72 : 64,
          paddingHorizontal: isWeb && isDesktop ? 24 : 0,
          ...(isWeb && isDesktop && {
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: -2 },
            shadowRadius: 8,
            elevation: 8,
          }),
        },
        tabBarLabelStyle: {
          fontSize: isWeb && isDesktop ? 12 : 10,
          fontWeight: '600',
          marginTop: isWeb && isDesktop ? 6 : 4,
        },
        tabBarIconStyle: {
          marginTop: isWeb && isDesktop ? 4 : 0,
        },
      }}
    >
      {/* Profile Tab - Always visible as the default landing page */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User 
              size={isWeb && isDesktop ? size + 2 : size} 
              color={color} 
              strokeWidth={2} 
            />
          ),
        }}
      />

      {/* Patient Tabs - Only visible to patients */}
      <Tabs.Screen
        name="care-card"
        options={{
          title: 'Care Card',
          tabBarIcon: ({ size, color }) => (
            <Heart 
              size={isWeb && isDesktop ? size + 2 : size} 
              color={color} 
              strokeWidth={2} 
            />
          ),
          // Hide for providers
          href: isPatient ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="symptoms"
        options={{
          title: 'Symptoms',
          tabBarIcon: ({ size, color }) => (
            <Activity 
              size={isWeb && isDesktop ? size + 2 : size} 
              color={color} 
              strokeWidth={2} 
            />
          ),
          // Hide for providers
          href: isPatient ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ size, color }) => (
            <BarChart3 
              size={isWeb && isDesktop ? size + 2 : size} 
              color={color} 
              strokeWidth={2} 
            />
          ),
          // Hide for providers
          href: isPatient ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="health-metrics"
        options={{
          title: 'Health',
          tabBarIcon: ({ size, color }) => (
            <Activity 
              size={isWeb && isDesktop ? size + 2 : size} 
              color={color} 
              strokeWidth={2} 
            />
          ),
          // Hide for providers
          href: isPatient ? undefined : null,
        }}
      />

      {/* Provider Tab - Only visible to providers */}
      <Tabs.Screen
        name="provider"
        options={{
          title: 'Provider',
          tabBarIcon: ({ size, color }) => (
            <Briefcase 
              size={isWeb && isDesktop ? size + 2 : size} 
              color={color} 
              strokeWidth={2} 
            />
          ),
          // Hide for patients
          href: isProvider ? undefined : null,
        }}
      />

      {/* Hide the old profile tab since index is now profile */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // This completely hides the tab
        }}
      />

      {/* Hide the old connect tab since it's now health-metrics */}
      <Tabs.Screen
        name="connect"
        options={{
          href: null, // This completely hides the tab
        }}
      />
    </Tabs>
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