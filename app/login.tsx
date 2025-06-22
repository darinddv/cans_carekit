import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Heart, Eye, EyeOff, Lock, Mail, User, Briefcase } from 'lucide-react-native';
import { SupabaseService } from '@/lib/supabaseService';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await SupabaseService.signInWithEmailAndPassword(email.trim(), password);
      // Navigation will be handled by the auth state change in _layout.tsx
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

    const { email: roleEmail, password: rolePassword } = credentials[role];

    try {
      await SupabaseService.signInWithEmailAndPassword(roleEmail, rolePassword);
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
          maxWidth: isLargeDesktop ? 480 : 420,
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
        input: {
          ...baseStyles.input,
          fontSize: isLargeDesktop ? 18 : 16,
          paddingVertical: isLargeDesktop ? 20 : 18,
        },
        loginButtonText: {
          ...baseStyles.loginButtonText,
          fontSize: isLargeDesktop ? 20 : 18,
        },
        roleButton: {
          ...baseStyles.roleButton,
          paddingVertical: isLargeDesktop ? 18 : 16,
          borderRadius: 16,
        },
        roleButtonText: {
          ...baseStyles.roleButtonText,
          fontSize: isLargeDesktop ? 16 : 15,
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
          style={{ flex: 1 }}
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
                Sign in to access your personalized care plan
              </Text>
            </View>

            {/* Login Form */}
            <View style={styles.form}>
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Email Input */}
              <View style={[
                styles.inputContainer,
                isWeb && isDesktop && {
                  paddingVertical: isLargeDesktop ? 8 : 6,
                  borderRadius: 20,
                }
              ]}>
                <View style={styles.inputIconContainer}>
                  <Mail 
                    size={isWeb && isDesktop ? 22 : 20} 
                    color="#8E8E93" 
                    strokeWidth={2} 
                  />
                </View>
                <TextInput
                  style={responsiveStyles.input}
                  placeholder="Email address"
                  placeholderTextColor="#8E8E93"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              {/* Password Input */}
              <View style={[
                styles.inputContainer,
                isWeb && isDesktop && {
                  paddingVertical: isLargeDesktop ? 8 : 6,
                  borderRadius: 20,
                }
              ]}>
                <View style={styles.inputIconContainer}>
                  <Lock 
                    size={isWeb && isDesktop ? 22 : 20} 
                    color="#8E8E93" 
                    strokeWidth={2} 
                  />
                </View>
                <TextInput
                  style={[responsiveStyles.input, styles.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff 
                      size={isWeb && isDesktop ? 22 : 20} 
                      color="#8E8E93" 
                      strokeWidth={2} 
                    />
                  ) : (
                    <Eye 
                      size={isWeb && isDesktop ? 22 : 20} 
                      color="#8E8E93" 
                      strokeWidth={2} 
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton, 
                  isLoading && styles.loginButtonDisabled,
                  isWeb && isDesktop && {
                    paddingVertical: isLargeDesktop ? 22 : 20,
                    borderRadius: 20,
                  }
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={responsiveStyles.loginButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={[
                styles.dividerText,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 14 : 13,
                }
              ]}>
                Or use demo accounts
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Demo Role Buttons */}
            <View style={styles.roleButtons}>
              {/* Patient Demo Button */}
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
                      width: isLargeDesktop ? 40 : 36,
                      height: isLargeDesktop ? 40 : 36,
                      borderRadius: isLargeDesktop ? 20 : 18,
                    }
                  ]}>
                    <User 
                      size={isWeb && isDesktop ? (isLargeDesktop ? 20 : 18) : 16} 
                      color="#FFFFFF" 
                      strokeWidth={2} 
                    />
                  </View>
                  <Text style={[responsiveStyles.roleButtonText, styles.patientButtonText]}>
                    Demo Patient
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Provider Demo Button */}
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
                      width: isLargeDesktop ? 40 : 36,
                      height: isLargeDesktop ? 40 : 36,
                      borderRadius: isLargeDesktop ? 20 : 18,
                    }
                  ]}>
                    <Briefcase 
                      size={isWeb && isDesktop ? (isLargeDesktop ? 20 : 18) : 16} 
                      color="#FFFFFF" 
                      strokeWidth={2} 
                    />
                  </View>
                  <Text style={[responsiveStyles.roleButtonText, styles.providerButtonText]}>
                    Demo Provider
                  </Text>
                </View>
              </TouchableOpacity>
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
    marginBottom: 40,
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
  form: {
    marginBottom: 24,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputIconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 16,
    fontWeight: '500',
  },
  passwordInput: {
    paddingRight: 12,
  },
  eyeButton: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#8E8E93',
    shadowOpacity: 0,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    fontSize: 12,
    color: '#8E8E93',
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
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
    justifyContent: 'center',
  },
  roleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  patientIconContainer: {
    backgroundColor: '#FF69B4',
  },
  providerIconContainer: {
    backgroundColor: '#007AFF',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  patientButtonText: {
    color: '#FF69B4',
  },
  providerButtonText: {
    color: '#007AFF',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});