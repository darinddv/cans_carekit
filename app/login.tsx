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
import { Eye, EyeOff, Lock, Mail, User, Briefcase } from 'lucide-react-native';
import { SupabaseService } from '@/lib/supabaseService';
import { router } from 'expo-router';

// Import SVG assets as components using relative paths
import BoltLogo from '../assets/images/bolt.svg';
import EntriLogo from '../assets/images/entri.svg';
import NetlifyLogo from '../assets/images/netlify.svg';
import SupabaseLogo from '../assets/images/supabase.svg';

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
  const isMobile = windowDimensions.width < 768;

  // Calculate responsive logo sizes - significantly increased for mobile
  const getLogoSize = () => {
    if (isMobile) {
      // Much larger on mobile - increased from 36:40 to 48:56
      return windowDimensions.width < 400 ? 48 : 56;
    } else if (isTablet) {
      return 40; // Increased from 34 to 40
    } else if (isDesktop) {
      return isLargeDesktop ? 44 : 40; // Increased from 38:34 to 44:40
    }
    return 40; // Increased from 30 to 40
  };

  const getMainIconSize = () => {
    if (isMobile) {
      return windowDimensions.width < 400 ? 40 : 48;
    } else if (isTablet) {
      return 60;
    } else if (isDesktop) {
      return isLargeDesktop ? 56 : 52;
    }
    return 48;
  };

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
        brandTitle: {
          ...baseStyles.brandTitle,
          fontSize: isLargeDesktop ? 48 : 44,
        },
        brandSubtitle: {
          ...baseStyles.brandSubtitle,
          fontSize: isLargeDesktop ? 20 : 18,
        },
        tagline: {
          ...baseStyles.tagline,
          fontSize: isLargeDesktop ? 16 : 15,
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
        brandTitle: {
          ...baseStyles.brandTitle,
          fontSize: 44,
        },
        brandSubtitle: {
          ...baseStyles.brandSubtitle,
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
                <BoltLogo 
                  width={getMainIconSize()}
                  height={getMainIconSize()}
                />
              </View>
              
              {/* Brand Name with Custom Styling */}
              <View style={styles.brandContainer}>
                <View style={styles.brandTitleContainer}>
                  <Text style={[responsiveStyles.brandTitle, styles.wellText]}>
                    well
                  </Text>
                  <Text style={[responsiveStyles.brandTitle, styles.comText]}>
                    COM
                  </Text>
                </View>
                <Text style={responsiveStyles.brandSubtitle}>
                  Collaborative Outcomes Management
                </Text>
              </View>
              
              <Text style={responsiveStyles.tagline}>
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

            {/* Powered By Section */}
            <View style={[
              styles.poweredBySection,
              isWeb && isDesktop && {
                marginTop: isLargeDesktop ? 32 : 28,
                paddingTop: isLargeDesktop ? 24 : 20,
              }
            ]}>
              <Text style={[
                styles.poweredByText,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 14 : 12,
                },
                isMobile && {
                  fontSize: 13, // Increased from 11 to 13
                }
              ]}>
                Powered by
              </Text>
              <View style={[
                styles.logosContainer,
                isMobile && {
                  gap: 16, // Increased gap on mobile for better spacing
                }
              ]}>
                <View style={styles.logoItem}>
                  <EntriLogo 
                    width={getLogoSize()}
                    height={getLogoSize()}
                  />
                </View>
                <View style={styles.logoItem}>
                  <NetlifyLogo 
                    width={getLogoSize()}
                    height={getLogoSize()}
                  />
                </View>
                <View style={styles.logoItem}>
                  <SupabaseLogo 
                    width={getLogoSize()}
                    height={getLogoSize()}
                  />
                </View>
              </View>
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
  brandContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  brandTitle: {
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  wellText: {
    fontFamily: 'DancingScript-Bold',
    fontSize: 40,
    color: '#007AFF',
    marginRight: 4,
  },
  comText: {
    fontFamily: 'Inter-Bold',
    fontSize: 40,
    color: '#1C1C1E',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 18,
    color: '#007AFF',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Regular',
  },
  poweredBySection: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  poweredByText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  logosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logoItem: {
    opacity: 0.7,
  },
});