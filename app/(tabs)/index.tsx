import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { 
  User, 
  LogOut, 
  Settings, 
  Shield, 
  Heart, 
  Briefcase,
  Mail,
  Calendar,
  Clock,
  ChevronRight,
  AlertCircle,
  RefreshCw
} from 'lucide-react-native';
import { useUser } from '@/contexts/UserContext';
import { SupabaseService } from '@/lib/supabaseService';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { userProfile, isLoading: userLoading, refreshProfile, error, clearError } = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await SupabaseService.signOut();
      // Navigation will be handled by the auth state change in UserContext
    } catch (err: any) {
      console.error('Error signing out:', err);
      // Don't show error for auth session missing - it's expected
      if (!err.message?.includes('Auth session missing')) {
        // Could show a toast or error message here
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      clearError();
      await refreshProfile();
    } catch (err) {
      console.error('Error refreshing profile:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isWeb = Platform.OS === 'web';
  const isTablet = windowDimensions.width >= 768;
  const isDesktop = windowDimensions.width >= 1024;
  const isLargeDesktop = windowDimensions.width >= 1440;

  const getResponsiveStyles = () => {
    const baseStyles = styles;
    
    if (isWeb && isDesktop) {
      return {
        ...baseStyles,
        container: {
          ...baseStyles.container,
          backgroundColor: '#F8F9FA',
        },
        content: {
          ...baseStyles.content,
          maxWidth: isLargeDesktop ? 1000 : 800,
          alignSelf: 'center',
          paddingHorizontal: isLargeDesktop ? 40 : 32,
          paddingTop: isLargeDesktop ? 48 : 40,
        },
        profileCard: {
          ...baseStyles.profileCard,
          borderRadius: 20,
          padding: isLargeDesktop ? 32 : 28,
        },
        name: {
          ...baseStyles.name,
          fontSize: isLargeDesktop ? 32 : 28,
        },
        email: {
          ...baseStyles.email,
          fontSize: isLargeDesktop ? 18 : 16,
        },
        roleText: {
          ...baseStyles.roleText,
          fontSize: isLargeDesktop ? 16 : 14,
        },
        menuItem: {
          ...baseStyles.menuItem,
          borderRadius: 16,
          padding: isLargeDesktop ? 20 : 18,
        },
        menuItemText: {
          ...baseStyles.menuItemText,
          fontSize: isLargeDesktop ? 18 : 16,
        },
        signOutButton: {
          ...baseStyles.signOutButton,
          borderRadius: 16,
          paddingVertical: isLargeDesktop ? 18 : 16,
        },
        signOutText: {
          ...baseStyles.signOutText,
          fontSize: isLargeDesktop ? 18 : 16,
        },
      };
    } else if (isWeb && isTablet) {
      return {
        ...baseStyles,
        content: {
          ...baseStyles.content,
          maxWidth: 600,
          alignSelf: 'center',
          paddingHorizontal: 32,
        },
      };
    }
    
    return baseStyles;
  };

  const responsiveStyles = getResponsiveStyles();

  if (userLoading) {
    return (
      <SafeAreaView style={responsiveStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isProvider = userProfile?.role === 'provider';
  const roleDisplayName = isProvider ? 'Healthcare Provider' : 'Patient';
  const roleIcon = isProvider ? Briefcase : Heart;

  // Quick actions based on role
  const quickActions = isProvider 
    ? [
        { icon: Briefcase, title: 'Provider Dashboard', subtitle: 'Manage patients and care plans', onPress: () => router.push('/(tabs)/provider') },
        { icon: Settings, title: 'Account Settings', subtitle: 'Manage your account preferences', onPress: () => {} },
      ]
    : [
        { icon: Heart, title: 'Care Card', subtitle: 'View your daily care tasks', onPress: () => router.push('/(tabs)/care-card') },
        { icon: Settings, title: 'Account Settings', subtitle: 'Manage your account preferences', onPress: () => {} },
      ];

  return (
    <SafeAreaView style={responsiveStyles.container}>
      <ScrollView 
        contentContainerStyle={responsiveStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={20} color="#FF3B30" strokeWidth={2} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
              <RefreshCw size={16} color="#007AFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Header */}
        <View style={responsiveStyles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[
              styles.avatarContainer,
              isWeb && isDesktop && {
                width: isLargeDesktop ? 100 : 90,
                height: isLargeDesktop ? 100 : 90,
                borderRadius: isLargeDesktop ? 50 : 45,
              }
            ]}>
              <User 
                size={isWeb && isDesktop ? (isLargeDesktop ? 48 : 44) : 40} 
                color="#007AFF" 
                strokeWidth={2} 
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={responsiveStyles.name}>
                {userProfile?.full_name || userProfile?.username || 'User'}
              </Text>
              <View style={styles.emailContainer}>
                <Mail 
                  size={isWeb && isDesktop ? 18 : 16} 
                  color="#8E8E93" 
                  strokeWidth={2} 
                />
                <Text style={responsiveStyles.email}>{userProfile?.email}</Text>
              </View>
            </View>
          </View>

          {/* Role Badge */}
          <View style={[
            styles.roleBadge,
            { backgroundColor: isProvider ? '#F0F9FF' : '#FFF0F5' },
            isWeb && isDesktop && {
              borderRadius: 12,
              paddingHorizontal: isLargeDesktop ? 20 : 18,
              paddingVertical: isLargeDesktop ? 12 : 10,
            }
          ]}>
            {React.createElement(roleIcon, {
              size: isWeb && isDesktop ? 20 : 18,
              color: isProvider ? '#007AFF' : '#FF69B4',
              strokeWidth: 2,
            })}
            <Text style={[
              responsiveStyles.roleText,
              { color: isProvider ? '#007AFF' : '#FF69B4' }
            ]}>
              {roleDisplayName}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            isWeb && isDesktop && {
              fontSize: isLargeDesktop ? 22 : 20,
            }
          ]}>
            Quick Actions
          </Text>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={responsiveStyles.menuItem}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[
                  styles.menuIconContainer,
                  isWeb && isDesktop && {
                    width: isLargeDesktop ? 48 : 44,
                    height: isLargeDesktop ? 48 : 44,
                    borderRadius: isLargeDesktop ? 24 : 22,
                  }
                ]}>
                  <action.icon 
                    size={isWeb && isDesktop ? (isLargeDesktop ? 24 : 22) : 20} 
                    color="#007AFF" 
                    strokeWidth={2} 
                  />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={responsiveStyles.menuItemText}>{action.title}</Text>
                  <Text style={[
                    styles.menuItemSubtitle,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 14 : 13,
                    }
                  ]}>
                    {action.subtitle}
                  </Text>
                </View>
              </View>
              <ChevronRight 
                size={isWeb && isDesktop ? 20 : 18} 
                color="#C7C7CC" 
                strokeWidth={2} 
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            isWeb && isDesktop && {
              fontSize: isLargeDesktop ? 22 : 20,
            }
          ]}>
            Account Information
          </Text>
          <View style={[
            styles.infoCard,
            isWeb && isDesktop && {
              borderRadius: 16,
              padding: isLargeDesktop ? 24 : 20,
            }
          ]}>
            <View style={styles.infoRow}>
              <Calendar 
                size={isWeb && isDesktop ? 20 : 18} 
                color="#8E8E93" 
                strokeWidth={2} 
              />
              <Text style={[
                styles.infoLabel,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 16 : 15,
                }
              ]}>
                Member since
              </Text>
              <Text style={[
                styles.infoValue,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 16 : 15,
                }
              ]}>
                {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Clock 
                size={isWeb && isDesktop ? 20 : 18} 
                color="#8E8E93" 
                strokeWidth={2} 
              />
              <Text style={[
                styles.infoLabel,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 16 : 15,
                }
              ]}>
                Last updated
              </Text>
              <Text style={[
                styles.infoValue,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 16 : 15,
                }
              ]}>
                {userProfile?.updated_at ? new Date(userProfile.updated_at).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={responsiveStyles.signOutButton}
          onPress={handleSignOut}
          disabled={isSigningOut}
          activeOpacity={0.7}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <>
              <LogOut 
                size={isWeb && isDesktop ? 22 : 20} 
                color="#FF3B30" 
                strokeWidth={2} 
              />
              <Text style={responsiveStyles.signOutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Security Notice */}
        <View style={[
          styles.securityNotice,
          isWeb && isDesktop && {
            borderRadius: 12,
            padding: isLargeDesktop ? 20 : 18,
          }
        ]}>
          <Shield 
            size={isWeb && isDesktop ? 18 : 16} 
            color="#34C759" 
            strokeWidth={2} 
          />
          <Text style={[
            styles.securityText,
            isWeb && isDesktop && {
              fontSize: isLargeDesktop ? 14 : 13,
            }
          ]}>
            Your data is protected with end-to-end encryption
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    marginLeft: 8,
  },
  retryButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  email: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 8,
    fontWeight: '500',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  securityText: {
    fontSize: 12,
    color: '#15803D',
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
  },
});