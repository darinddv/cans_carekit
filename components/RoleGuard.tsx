import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useUser } from '@/contexts/UserContext';
import { Shield, AlertTriangle } from 'lucide-react-native';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackMessage?: string;
}

export function RoleGuard({ children, allowedRoles, fallbackMessage }: RoleGuardProps) {
  const { userProfile, isLoading } = useUser();

  // Show loading state while user profile is being fetched
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Shield size={48} color="#8E8E93" strokeWidth={1.5} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if user has required role
  const userRole = userProfile?.role || 'patient'; // Default to patient
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <AlertTriangle size={64} color="#FF3B30" strokeWidth={2} />
          </View>
          <Text style={styles.title}>Access Restricted</Text>
          <Text style={styles.message}>
            {fallbackMessage || `This section is not available for ${userRole} users.`}
          </Text>
          <Text style={styles.hint}>
            Contact your administrator if you believe this is an error.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
});