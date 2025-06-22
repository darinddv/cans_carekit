import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Heart, User, Briefcase } from 'lucide-react-native';
import { SupabaseService } from '@/lib/supabaseService';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const handleRoleLogin = async (role: 'patient' | 'provider') => {
    setIsLoading(true);
    setError(null);

    // Predefined credentials for each role
    const credentials = {
      patient: {
        email: 'patient@carecard.app',
        password: 'patient123'
      },
      provider: {
        email: 'provider@carecard.app',
        password: 'provider123'
      }
    };

    const { email, password } = credentials[role];

    try {
      await SupabaseService.signInWithEmailAndPassword(email, password);
      // Navigation will be handled by the auth state change in _layout.tsx
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
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
          maxWidth: isLargeDesktop ? 520 : 460,
          alignSelf: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: isLargeDesktop ? 48 : 40,
          marginHorizontal: 24,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 24,
          elevation: 8,
        },
        title: {
          ...baseStyles.title,
          fontSize: isLargeDesktop ? 40 : 36,
        },
        subtitle: {
          ...baseStyles.subtitle,
          fontSize: isLargeDesktop ? 18 : 16,
        },
        roleButton: {
          ...baseStyles.roleButton,
          paddingVertical: isLargeDesktop ? 24 : 22,
          borderRadius: 20,
        },
        roleButtonText: {
          ...baseStyles.roleButtonText,
          fontSize: isLargeDesktop ? 20 : 18,
        },
        roleButtonSubtext: {
          ...baseStyles.roleButtonSubtext,
          fontSize: isLargeDesktop ? 16 : 14,
        },
      };
    } else if (isWeb && isTablet) {
      return {
        ...baseStyles,
        content: {
          ...baseStyles.content,
          maxWidth: 480,
          alignSelf: 'center',
          paddingHorizontal: 32,
        },
        title: {
          ...baseStyles.title,
          fontSize: 36,
        },
        subtitle: {
          ...baseStyles.subtitle,
          fontSize: 18,
        },
      };
    }
    
    return baseStyles;
  };

  const responsiveStyles = getResponsiveStyles();

  const ContentWrapper = isWeb && isDesktop ? ScrollView : View;

  return (
    <SafeAreaView style={responsiveStyles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ContentWrapper 
          style={isWeb && isDesktop ? { flex: 1 } : undefined}
          contentContainerStyle={isWeb && isDesktop ? { flex: 1, justifyContent: 'center' } : undefined}
          showsVerticalScrollIndicator={false}
        >
          <View style={responsiveStyles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[
                styles.iconContainer,
                isWeb && isDesktop && {
                  width: isLargeDesktop ? 100 : 90,
                  height: isLargeDesktop ? 100 : 90,
                  borderRadius: isLargeDesktop ? 50 : 45,
                }
              ]}>
                <Heart 
                  size={isWeb && isDesktop ? (isLargeDesktop ? 56 : 52) : 48} 
                  color="#007AFF" 
                  strokeWidth={2} 
                />
              </View>
              <Text style={responsiveStyles.title}>Care Card</Text>
              <Text style={responsiveStyles.subtitle}>
                Choose your role to access the platform
              </Text>
            </View>

            {/* Error Display */}
            {error && (
              <View style={[
                styles.errorContainer,
                isWeb && isDesktop && {
                  borderRadius: 16,
                  padding: isLargeDesktop ? 20 : 18,
                }
              ]}>
                <Text style={[
                  styles.errorText,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 16 : 15,
                  }
                ]}>{error}</Text>
              </View>
            )}

            {/* Role Selection */}
            <View style={styles.roleSelection}>
              {/* Patient Login Button */}
              <TouchableOpacity
                style={[
                  responsiveStyles.roleButton,
                  styles.patientButton,
                  isLoading && styles.roleButtonDisabled
                ]}
                onPress={() => handleRoleLogin('patient')}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <View style={styles.roleButtonContent}>
                  <View style={[
                    styles.roleIconContainer,
                    styles.patientIconContainer,
                    isWeb && isDesktop && {
                      width: isLargeDesktop ? 64 : 60,
                      height: isLargeDesktop ? 64 : 60,
                      borderRadius: isLargeDesktop ? 32 : 30,
                    }
                  ]}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <User 
                        size={isWeb && isDesktop ? (isLargeDesktop ? 32 : 30) : 28} 
                        color="#FFFFFF" 
                        strokeWidth={2} 
                      />
                    )}
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={[responsiveStyles.roleButtonText, styles.patientButtonText]}>
                      Login as Patient
                    </Text>
                    <Text style={[responsiveStyles.roleButtonSubtext, styles.patientButtonSubtext]}>
                      Access your care plan and track progress
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Provider Login Button */}
              <TouchableOpacity
                style={[
                  responsiveStyles.roleButton,
                  styles.providerButton,
                  isLoading && styles.roleButtonDisabled
                ]}
                onPress={() => handleRoleLogin('provider')}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <View style={styles.roleButtonContent}>
                  <View style={[
                    styles.roleIconContainer,
                    styles.providerIconContainer,
                    isWeb && isDesktop && {
                      width: isLargeDesktop ? 64 : 60,
                      height: isLargeDesktop ? 64 : 60,
                      borderRadius: isLargeDesktop ? 32 : 30,
                    }
                  ]}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Briefcase 
                        size={isWeb && isDesktop ? (isLargeDesktop ? 32 : 30) : 28} 
                        color="#FFFFFF" 
                        strokeWidth={2} 
                      />
                    )}
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={[responsiveStyles.roleButtonText, styles.providerButtonText]}>
                      Login as Provider
                    </Text>
                    <Text style={[responsiveStyles.roleButtonSubtext, styles.providerButtonSubtext]}>
                      Manage patients and care plans
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Credentials Info */}
            <View style={[
              styles.credentialsInfo,
              isWeb && isDesktop && {
                borderRadius: 16,
                padding: isLargeDesktop ? 24 : 20,
              }
            ]}>
              <Text style={[
                styles.credentialsTitle,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 18 : 16,
                }
              ]}>
                Demo Credentials
              </Text>
              <View style={styles.credentialsList}>
                <View style={styles.credentialItem}>
                  <Text style={[
                    styles.credentialRole,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 16 : 14,
                    }
                  ]}>
                    Patient:
                  </Text>
                  <Text style={[
                    styles.credentialText,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 14 : 13,
                    }
                  ]}>
                    patient@carecard.app
                  </Text>
                </View>
                <View style={styles.credentialItem}>
                  <Text style={[
                    styles.credentialRole,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 16 : 14,
                    }
                  ]}>
                    Provider:
                  </Text>
                  <Text style={[
                    styles.credentialText,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 14 : 13,
                    }
                  ]}>
                    provider@carecard.app
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[
                styles.footerText,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 14 : 13,
                }
              ]}>
                Secure authentication powered by Supabase
              </Text>
            </View>
          </View>
        </ContentWrapper>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    textAlign: 'center',
  },
  roleSelection: {
    marginBottom: 32,
  },
  roleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleButtonDisabled: {
    opacity: 0.6,
  },
  patientButton: {
    borderColor: '#FF69B4',
    backgroundColor: '#FFF0F5',
  },
  providerButton: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F9FF',
  },
  roleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  patientIconContainer: {
    backgroundColor: '#FF69B4',
  },
  providerIconContainer: {
    backgroundColor: '#007AFF',
  },
  roleTextContainer: {
    flex: 1,
  },
  roleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  patientButtonText: {
    color: '#FF69B4',
  },
  providerButtonText: {
    color: '#007AFF',
  },
  roleButtonSubtext: {
    fontSize: 14,
    fontWeight: '500',
  },
  patientButtonSubtext: {
    color: '#C1477A',
  },
  providerButtonSubtext: {
    color: '#0056CC',
  },
  credentialsInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  credentialsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  credentialsList: {
    gap: 8,
  },
  credentialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credentialRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  credentialText: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});