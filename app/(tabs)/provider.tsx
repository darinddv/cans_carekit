import { View, Text, StyleSheet, SafeAreaView, Dimensions, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Briefcase, Users, Calendar, ChartBar as BarChart3, MessageSquare, Shield, Clock, TrendingUp } from 'lucide-react-native';
import { useState, useEffect } from 'react';

export default function ProviderScreen() {
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

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
          maxWidth: isLargeDesktop ? 1200 : 1000,
          alignSelf: 'center',
          paddingHorizontal: isLargeDesktop ? 40 : 32,
          paddingTop: isLargeDesktop ? 48 : 40,
        },
        title: {
          ...baseStyles.title,
          fontSize: isLargeDesktop ? 40 : 36,
        },
        subtitle: {
          ...baseStyles.subtitle,
          fontSize: isLargeDesktop ? 18 : 16,
        },
        sectionTitle: {
          ...baseStyles.sectionTitle,
          fontSize: isLargeDesktop ? 24 : 22,
        },
        featureCard: {
          ...baseStyles.featureCard,
          borderRadius: 20,
          padding: isLargeDesktop ? 28 : 24,
        },
        featureTitle: {
          ...baseStyles.featureTitle,
          fontSize: isLargeDesktop ? 20 : 18,
        },
        featureDescription: {
          ...baseStyles.featureDescription,
          fontSize: isLargeDesktop ? 16 : 15,
        },
        statsCard: {
          ...baseStyles.statsCard,
          borderRadius: 16,
          padding: isLargeDesktop ? 24 : 20,
        },
        statsNumber: {
          ...baseStyles.statsNumber,
          fontSize: isLargeDesktop ? 32 : 28,
        },
        statsLabel: {
          ...baseStyles.statsLabel,
          fontSize: isLargeDesktop ? 16 : 14,
        },
      };
    } else if (isWeb && isTablet) {
      return {
        ...baseStyles,
        content: {
          ...baseStyles.content,
          maxWidth: 800,
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

  const features = [
    {
      icon: Users,
      title: 'Patient Management',
      description: 'View and manage patient care cards, track progress, and monitor adherence to treatment plans.',
      color: '#007AFF',
      bgColor: '#F0F9FF',
    },
    {
      icon: Calendar,
      title: 'Appointment Scheduling',
      description: 'Schedule appointments, manage availability, and send automated reminders to patients.',
      color: '#34C759',
      bgColor: '#F0FDF4',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Access comprehensive reports on patient outcomes, treatment effectiveness, and care metrics.',
      color: '#FF9500',
      bgColor: '#FFF7ED',
    },
    {
      icon: MessageSquare,
      title: 'Secure Communication',
      description: 'Communicate securely with patients and care team members through encrypted messaging.',
      color: '#AF52DE',
      bgColor: '#FAF5FF',
    },
  ];

  const stats = [
    { number: '247', label: 'Active Patients', color: '#007AFF' },
    { number: '94%', label: 'Adherence Rate', color: '#34C759' },
    { number: '18', label: 'Appointments Today', color: '#FF9500' },
    { number: '12', label: 'Pending Reviews', color: '#FF3B30' },
  ];

  return (
    <SafeAreaView style={responsiveStyles.container}>
      <ScrollView 
        contentContainerStyle={responsiveStyles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[
            styles.iconContainer,
            isWeb && isDesktop && {
              width: isLargeDesktop ? 100 : 90,
              height: isLargeDesktop ? 100 : 90,
              borderRadius: isLargeDesktop ? 50 : 45,
              marginBottom: isLargeDesktop ? 32 : 28,
            }
          ]}>
            <Briefcase 
              size={isWeb && isDesktop ? (isLargeDesktop ? 56 : 52) : 48} 
              color="#007AFF" 
              strokeWidth={2} 
            />
          </View>
          <Text style={responsiveStyles.title}>Provider Portal</Text>
          <Text style={responsiveStyles.subtitle}>
            Comprehensive care management platform for healthcare providers
          </Text>
        </View>

        {/* Quick Stats - Desktop Only */}
        {isWeb && isDesktop && (
          <View style={styles.statsSection}>
            <Text style={responsiveStyles.sectionTitle}>Dashboard Overview</Text>
            <View style={[
              styles.statsGrid,
              isLargeDesktop && { gap: 24 }
            ]}>
              {stats.map((stat, index) => (
                <View key={index} style={responsiveStyles.statsCard}>
                  <Text style={[responsiveStyles.statsNumber, { color: stat.color }]}>
                    {stat.number}
                  </Text>
                  <Text style={responsiveStyles.statsLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={[
            responsiveStyles.sectionTitle,
            { marginBottom: isWeb && isDesktop ? (isLargeDesktop ? 32 : 28) : 24 }
          ]}>
            Core Features
          </Text>
          <View style={[
            styles.featuresGrid,
            isWeb && isDesktop && {
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: isLargeDesktop ? 24 : 20,
            }
          ]}>
            {features.map((feature, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  responsiveStyles.featureCard,
                  { backgroundColor: feature.bgColor },
                  isWeb && isDesktop && {
                    flex: isLargeDesktop ? '0 0 calc(50% - 12px)' : '0 0 calc(50% - 10px)',
                    maxWidth: isLargeDesktop ? 'calc(50% - 12px)' : 'calc(50% - 10px)',
                  }
                ]}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.featureIconContainer,
                  { backgroundColor: feature.color },
                  isWeb && isDesktop && {
                    width: isLargeDesktop ? 64 : 60,
                    height: isLargeDesktop ? 64 : 60,
                    borderRadius: isLargeDesktop ? 32 : 30,
                  }
                ]}>
                  <feature.icon 
                    size={isWeb && isDesktop ? (isLargeDesktop ? 32 : 30) : 28} 
                    color="#FFFFFF" 
                    strokeWidth={2} 
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={responsiveStyles.featureTitle}>{feature.title}</Text>
                  <Text style={responsiveStyles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Additional Features - Desktop Only */}
        {isWeb && isDesktop && (
          <View style={styles.additionalSection}>
            <Text style={responsiveStyles.sectionTitle}>Advanced Capabilities</Text>
            <View style={styles.capabilitiesList}>
              <View style={styles.capabilityItem}>
                <View style={styles.capabilityDot} />
                <Text style={[
                  styles.capabilityText,
                  isLargeDesktop && { fontSize: 16 }
                ]}>
                  Real-time patient monitoring and alerts
                </Text>
              </View>
              <View style={styles.capabilityItem}>
                <View style={styles.capabilityDot} />
                <Text style={[
                  styles.capabilityText,
                  isLargeDesktop && { fontSize: 16 }
                ]}>
                  Integration with electronic health records (EHR)
                </Text>
              </View>
              <View style={styles.capabilityItem}>
                <View style={styles.capabilityDot} />
                <Text style={[
                  styles.capabilityText,
                  isLargeDesktop && { fontSize: 16 }
                ]}>
                  Automated care plan generation and updates
                </Text>
              </View>
              <View style={styles.capabilityItem}>
                <View style={styles.capabilityDot} />
                <Text style={[
                  styles.capabilityText,
                  isLargeDesktop && { fontSize: 16 }
                ]}>
                  Multi-provider collaboration tools
                </Text>
              </View>
              <View style={styles.capabilityItem}>
                <View style={styles.capabilityDot} />
                <Text style={[
                  styles.capabilityText,
                  isLargeDesktop && { fontSize: 16 }
                ]}>
                  HIPAA-compliant data security and privacy
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Security Badge */}
        <View style={[
          styles.securityBadge,
          isWeb && isDesktop && {
            borderRadius: 16,
            padding: isLargeDesktop ? 24 : 20,
          }
        ]}>
          <Shield 
            size={isWeb && isDesktop ? (isLargeDesktop ? 28 : 26) : 24} 
            color="#34C759" 
            strokeWidth={2} 
          />
          <Text style={[
            styles.securityText,
            isWeb && isDesktop && {
              fontSize: isLargeDesktop ? 16 : 15,
            }
          ]}>
            HIPAA Compliant • End-to-End Encrypted • SOC 2 Certified
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[
            styles.footerText,
            isWeb && isDesktop && {
              fontSize: isLargeDesktop ? 14 : 13,
            }
          ]}>
            Empowering healthcare providers with intelligent care management
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    borderWidth: 2,
    borderColor: '#007AFF',
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
  statsSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 32,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  additionalSection: {
    marginBottom: 32,
  },
  capabilitiesList: {
    marginTop: 16,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  capabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 16,
  },
  capabilityText: {
    fontSize: 15,
    color: '#1C1C1E',
    flex: 1,
    lineHeight: 22,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  securityText: {
    fontSize: 14,
    color: '#15803D',
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
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