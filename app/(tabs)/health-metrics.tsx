import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Dimensions, 
  Platform,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { 
  Activity, 
  Heart, 
  Moon, 
  Footprints, 
  Droplets, 
  Thermometer,
  TrendingUp,
  Calendar,
  Clock,
  Plus,
  ChevronRight,
  Shield,
  Smartphone
} from 'lucide-react-native';
import { RoleGuard } from '@/components/RoleGuard';
import { 
  HealthService, 
  HealthMetric, 
  SleepData, 
  HeartRateData,
  formatSleepDuration,
  getSleepQualityColor,
  getHeartRateZone
} from '@/lib/healthService';

function HealthMetricsContent() {
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  
  // Health data state
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [stepsData, setStepsData] = useState<HealthMetric[]>([]);
  const [heartRateData, setHeartRateData] = useState<HeartRateData | null>(null);
  const [hydrationData, setHydrationData] = useState<HealthMetric[]>([]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    initializeHealthData();
  }, []);

  const initializeHealthData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Request permissions
      const hasPermissions = await HealthService.requestPermissions();
      setPermissionsGranted(hasPermissions);

      if (hasPermissions) {
        await loadHealthData();
      }
    } catch (err: any) {
      console.error('Error initializing health data:', err);
      setError(err.message || 'Failed to load health data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHealthData = async () => {
    try {
      const [sleep, steps, heartRate, hydration] = await Promise.all([
        HealthService.getSleepData(7),
        HealthService.getStepsData(7),
        HealthService.getHeartRateData(),
        HealthService.getHydrationData(),
      ]);

      setSleepData(sleep);
      setStepsData(steps);
      setHeartRateData(heartRate);
      setHydrationData(hydration);
    } catch (err: any) {
      console.error('Error loading health data:', err);
      setError(err.message || 'Failed to load health data');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadHealthData();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh health data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const requestPermissions = async () => {
    try {
      setIsLoading(true);
      const hasPermissions = await HealthService.requestPermissions();
      setPermissionsGranted(hasPermissions);
      
      if (hasPermissions) {
        await loadHealthData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request permissions');
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
        metricCard: {
          ...baseStyles.metricCard,
          borderRadius: 20,
          padding: isLargeDesktop ? 24 : 20,
        },
        quickMetricCard: {
          ...baseStyles.quickMetricCard,
          borderRadius: 16,
          padding: isLargeDesktop ? 20 : 18,
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

  // Calculate current metrics from loaded data
  const currentSleep = sleepData[0];
  const todaySteps = stepsData[0];
  const currentHydration = hydrationData[0];

  const healthMetrics = [
    {
      id: 'sleep',
      title: 'Sleep',
      value: currentSleep ? formatSleepDuration(currentSleep.duration) : '--',
      subtitle: 'Last night',
      icon: Moon,
      color: '#6366F1',
      bgColor: '#EEF2FF',
      trend: currentSleep ? `${currentSleep.quality} quality` : 'No data',
      trendUp: currentSleep?.quality === 'good' || currentSleep?.quality === 'excellent',
    },
    {
      id: 'steps',
      title: 'Steps',
      value: todaySteps ? todaySteps.value.toLocaleString() : '--',
      subtitle: 'Today',
      icon: Footprints,
      color: '#10B981',
      bgColor: '#ECFDF5',
      trend: todaySteps ? `${Math.max(0, 10000 - Number(todaySteps.value))} to goal` : 'No data',
      trendUp: todaySteps ? Number(todaySteps.value) > 8000 : false,
    },
    {
      id: 'heart-rate',
      title: 'Heart Rate',
      value: heartRateData ? `${heartRateData.resting} BPM` : '--',
      subtitle: 'Resting',
      icon: Heart,
      color: '#EF4444',
      bgColor: '#FEF2F2',
      trend: heartRateData ? getHeartRateZone(heartRateData.resting).zone : 'No data',
      trendUp: heartRateData ? heartRateData.resting >= 60 && heartRateData.resting <= 100 : false,
    },
    {
      id: 'hydration',
      title: 'Water Intake',
      value: currentHydration ? `${currentHydration.value}${currentHydration.unit}` : '--',
      subtitle: 'Today',
      icon: Droplets,
      color: '#06B6D4',
      bgColor: '#ECFEFF',
      trend: currentHydration ? `${Math.max(0, 2.0 - Number(currentHydration.value)).toFixed(1)}L to goal` : 'No data',
      trendUp: currentHydration ? Number(currentHydration.value) >= 1.5 : false,
    },
  ];

  const quickActions = [
    {
      title: 'Log Symptoms',
      subtitle: 'Track how you feel today',
      icon: Activity,
      color: '#F59E0B',
      onPress: () => {},
    },
    {
      title: 'Record Vitals',
      subtitle: 'Blood pressure, temperature',
      icon: Thermometer,
      color: '#EF4444',
      onPress: () => {},
    },
    {
      title: 'View Trends',
      subtitle: 'Weekly and monthly insights',
      icon: TrendingUp,
      color: '#8B5CF6',
      onPress: () => {},
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={responsiveStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading health data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permissionsGranted) {
    return (
      <SafeAreaView style={responsiveStyles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Shield size={64} color="#007AFF" strokeWidth={2} />
          </View>
          <Text style={styles.permissionTitle}>Health Data Access</Text>
          <Text style={styles.permissionMessage}>
            To provide personalized health insights, we need access to your health data.
          </Text>
          <Text style={styles.permissionNote}>
            {Platform.OS === 'web' 
              ? 'Currently showing demo data. Connect Apple Health or Google Fit for real data.'
              : 'Your data is kept private and secure on your device.'
            }
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermissions}
            activeOpacity={0.8}
          >
            <Smartphone size={20} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.permissionButtonText}>
              {Platform.OS === 'web' ? 'View Demo Data' : 'Grant Access'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={[
                styles.iconContainer,
                isWeb && isDesktop && {
                  width: isLargeDesktop ? 80 : 70,
                  height: isLargeDesktop ? 80 : 70,
                  borderRadius: isLargeDesktop ? 40 : 35,
                }
              ]}>
                <Activity 
                  size={isWeb && isDesktop ? (isLargeDesktop ? 40 : 36) : 32} 
                  color="#007AFF" 
                  strokeWidth={2} 
                />
              </View>
              <View>
                <Text style={responsiveStyles.title}>Health Metrics</Text>
                <Text style={responsiveStyles.subtitle}>
                  Track your wellness journey
                </Text>
              </View>
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Today's Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryTitle}>Today's Overview</Text>
                <Text style={styles.summaryDate}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
              <View style={styles.summaryScore}>
                <Text style={styles.scoreNumber}>
                  {heartRateData && todaySteps && currentSleep ? '85' : '--'}
                </Text>
                <Text style={styles.scoreLabel}>Health Score</Text>
              </View>
            </View>
            
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Heart size={16} color="#EF4444" strokeWidth={2} />
                <Text style={styles.summaryStatValue}>
                  {heartRateData ? heartRateData.resting : '--'}
                </Text>
                <Text style={styles.summaryStatLabel}>BPM</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Footprints size={16} color="#10B981" strokeWidth={2} />
                <Text style={styles.summaryStatValue}>
                  {todaySteps ? `${(Number(todaySteps.value) / 1000).toFixed(1)}K` : '--'}
                </Text>
                <Text style={styles.summaryStatLabel}>Steps</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Moon size={16} color="#6366F1" strokeWidth={2} />
                <Text style={styles.summaryStatValue}>
                  {currentSleep ? `${Math.floor(currentSleep.duration / 60)}h` : '--'}
                </Text>
                <Text style={styles.summaryStatLabel}>Sleep</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Health Metrics Grid */}
        <View style={styles.section}>
          <Text style={responsiveStyles.sectionTitle}>Your Metrics</Text>
          <View style={[
            styles.metricsGrid,
            isWeb && isDesktop && {
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: isLargeDesktop ? 20 : 16,
            }
          ]}>
            {healthMetrics.map((metric) => (
              <TouchableOpacity
                key={metric.id}
                style={[
                  responsiveStyles.metricCard,
                  { backgroundColor: metric.bgColor },
                  isWeb && isDesktop && {
                    flex: isLargeDesktop ? '0 0 calc(50% - 10px)' : '0 0 calc(50% - 8px)',
                    maxWidth: isLargeDesktop ? 'calc(50% - 10px)' : 'calc(50% - 8px)',
                  }
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.metricHeader}>
                  <View style={[
                    styles.metricIconContainer,
                    { backgroundColor: metric.color },
                    isWeb && isDesktop && {
                      width: isLargeDesktop ? 48 : 44,
                      height: isLargeDesktop ? 48 : 44,
                      borderRadius: isLargeDesktop ? 24 : 22,
                    }
                  ]}>
                    <metric.icon 
                      size={isWeb && isDesktop ? (isLargeDesktop ? 24 : 22) : 20} 
                      color="#FFFFFF" 
                      strokeWidth={2} 
                    />
                  </View>
                  <ChevronRight 
                    size={isWeb && isDesktop ? 20 : 18} 
                    color="#8E8E93" 
                    strokeWidth={2} 
                  />
                </View>
                
                <View style={styles.metricContent}>
                  <Text style={[
                    styles.metricValue,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 28 : 26,
                    }
                  ]}>
                    {metric.value}
                  </Text>
                  <Text style={[
                    styles.metricTitle,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 18 : 16,
                    }
                  ]}>
                    {metric.title}
                  </Text>
                  <Text style={[
                    styles.metricSubtitle,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 14 : 13,
                    }
                  ]}>
                    {metric.subtitle}
                  </Text>
                </View>

                <View style={styles.metricTrend}>
                  <TrendingUp 
                    size={isWeb && isDesktop ? 14 : 12} 
                    color={metric.trendUp ? '#10B981' : '#F59E0B'} 
                    strokeWidth={2} 
                  />
                  <Text style={[
                    styles.metricTrendText,
                    { color: metric.trendUp ? '#10B981' : '#F59E0B' },
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 13 : 12,
                    }
                  ]}>
                    {metric.trend}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={responsiveStyles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsList}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={responsiveStyles.quickMetricCard}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionContent}>
                  <View style={[
                    styles.quickActionIcon,
                    { backgroundColor: `${action.color}20` },
                    isWeb && isDesktop && {
                      width: isLargeDesktop ? 48 : 44,
                      height: isLargeDesktop ? 48 : 44,
                      borderRadius: isLargeDesktop ? 24 : 22,
                    }
                  ]}>
                    <action.icon 
                      size={isWeb && isDesktop ? (isLargeDesktop ? 24 : 22) : 20} 
                      color={action.color} 
                      strokeWidth={2} 
                    />
                  </View>
                  <View style={styles.quickActionText}>
                    <Text style={[
                      styles.quickActionTitle,
                      isWeb && isDesktop && {
                        fontSize: isLargeDesktop ? 18 : 16,
                      }
                    ]}>
                      {action.title}
                    </Text>
                    <Text style={[
                      styles.quickActionSubtitle,
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
        </View>

        {/* Health Tips */}
        <View style={styles.section}>
          <Text style={responsiveStyles.sectionTitle}>Health Tips</Text>
          <View style={[
            styles.tipsCard,
            isWeb && isDesktop && {
              borderRadius: 20,
              padding: isLargeDesktop ? 24 : 20,
            }
          ]}>
            <Image
              source={{ uri: 'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg?auto=compress&cs=tinysrgb&w=800' }}
              style={[
                styles.tipsImage,
                isWeb && isDesktop && {
                  height: isLargeDesktop ? 160 : 140,
                  borderRadius: isLargeDesktop ? 16 : 12,
                }
              ]}
              resizeMode="cover"
            />
            <View style={styles.tipsContent}>
              <Text style={[
                styles.tipsTitle,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 20 : 18,
                }
              ]}>
                Stay Hydrated
              </Text>
              <Text style={[
                styles.tipsDescription,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 16 : 15,
                }
              ]}>
                Drinking enough water helps maintain energy levels and supports overall health. Aim for 8 glasses per day.
              </Text>
              <TouchableOpacity style={[
                styles.tipsButton,
                isWeb && isDesktop && {
                  paddingVertical: isLargeDesktop ? 14 : 12,
                  borderRadius: 12,
                }
              ]}>
                <Text style={[
                  styles.tipsButtonText,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 16 : 15,
                  }
                ]}>
                  Learn More
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Data Source Info */}
        <View style={styles.dataSourceCard}>
          <View style={styles.dataSourceHeader}>
            <Smartphone size={20} color="#007AFF" strokeWidth={2} />
            <Text style={styles.dataSourceTitle}>Data Source</Text>
          </View>
          <Text style={styles.dataSourceText}>
            {Platform.OS === 'web' 
              ? 'Currently displaying demo data. To view real health metrics, use the mobile app with Apple Health or Google Fit integration.'
              : 'Health data syncs automatically from your device sensors and connected health apps.'
            }
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
            Your health data is private and secure
          </Text>
          <Text style={[
            styles.footerSubtext,
            isWeb && isDesktop && {
              fontSize: isLargeDesktop ? 12 : 11,
            }
          ]}>
            Data is processed locally on your device
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function HealthMetricsScreen() {
  return (
    <RoleGuard 
      allowedRoles={['patient']} 
      fallbackMessage="Health metrics tracking is designed for patients to monitor their wellness journey."
    >
      <HealthMetricsContent />
    </RoleGuard>
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  permissionNote: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
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
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
  },
  summarySection: {
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  summaryDate: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  summaryScore: {
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 4,
    marginBottom: 2,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  metricsGrid: {
    gap: 16,
  },
  metricCard: {
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
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricContent: {
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricTrendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  quickActionsList: {
    gap: 12,
  },
  quickMetricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
  },
  tipsImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  tipsDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  tipsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  tipsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dataSourceCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dataSourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataSourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  dataSourceText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});