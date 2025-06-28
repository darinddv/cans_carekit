import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Activity, Plus, TrendingUp, TrendingDown, Minus, Calendar, Clock, Target, ChartBar as BarChart3, CreditCard as Edit3, Trash2, X, Check, CircleAlert as AlertCircle, Heart, Zap, Battery, Moon, Users, Utensils, TestTube } from 'lucide-react-native';
import { RoleGuard } from '@/components/RoleGuard';
import {
  SymptomService,
  SymptomCategory,
  SymptomLogWithCategory,
  SymptomTrend,
  AssessmentTemplate,
} from '@/lib/symptomService';
import { NotificationService } from '@/lib/notificationService';

// Icon mapping for symptom categories
const categoryIcons: Record<string, any> = {
  heart: Heart,
  zap: Zap,
  battery: Battery,
  moon: Moon,
  'alert-circle': AlertCircle,
  target: Target,
  users: Users,
  utensils: Utensils,
};

function SymptomsContent() {
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [categories, setCategories] = useState<SymptomCategory[]>([]);
  const [recentLogs, setRecentLogs] = useState<SymptomLogWithCategory[]>([]);
  const [trends, setTrends] = useState<SymptomTrend[]>([]);
  const [assessmentTemplates, setAssessmentTemplates] = useState<AssessmentTemplate[]>([]);
  
  // UI state
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SymptomCategory | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentTemplate | null>(null);
  
  // Form state
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedCoping, setSelectedCoping] = useState<string[]>([]);
  const [customTrigger, setCustomTrigger] = useState('');
  const [customCoping, setCustomCoping] = useState('');

  // Testing state
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Common triggers and coping strategies
  const commonTriggers = [
    'Stress', 'Lack of sleep', 'Work pressure', 'Social situations', 'Weather changes',
    'Caffeine', 'Alcohol', 'Conflict', 'Deadlines', 'Crowds', 'Noise', 'Changes in routine'
  ];

  const commonCoping = [
    'Deep breathing', 'Meditation', 'Exercise', 'Music', 'Talking to someone',
    'Journaling', 'Walking', 'Rest', 'Distraction', 'Mindfulness', 'Yoga', 'Reading'
  ];

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [categoriesData, logsData, trendsData, templatesData] = await Promise.all([
        SymptomService.getSymptomCategories(),
        SymptomService.getSymptomLogs(7), // Last 7 days
        SymptomService.getSymptomTrends(30), // Last 30 days
        SymptomService.getAssessmentTemplates(),
      ]);

      setCategories(categoriesData);
      setRecentLogs(logsData);
      setTrends(trendsData);
      setAssessmentTemplates(templatesData);
    } catch (err: any) {
      console.error('Error loading symptom data:', err);
      setError(err.message || 'Failed to load symptom data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const openLogModal = (category: SymptomCategory) => {
    setSelectedCategory(category);
    setSeverity(5);
    setNotes('');
    setSelectedTriggers([]);
    setSelectedCoping([]);
    setCustomTrigger('');
    setCustomCoping('');
    setShowLogModal(true);
  };

  const closeLogModal = () => {
    setShowLogModal(false);
    setSelectedCategory(null);
  };

  const submitSymptomLog = async () => {
    if (!selectedCategory) return;

    try {
      const triggers = [...selectedTriggers];
      if (customTrigger.trim()) {
        triggers.push(customTrigger.trim());
      }

      const copingStrategies = [...selectedCoping];
      if (customCoping.trim()) {
        copingStrategies.push(customCoping.trim());
      }

      await SymptomService.logSymptom({
        category_id: selectedCategory.id,
        severity,
        notes: notes.trim() || null,
        triggers: triggers.length > 0 ? triggers : null,
        coping_strategies: copingStrategies.length > 0 ? copingStrategies : null,
      });

      closeLogModal();
      await loadData(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to log symptom');
    }
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers(prev => 
      prev.includes(trigger) 
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  };

  const toggleCoping = (coping: string) => {
    setSelectedCoping(prev => 
      prev.includes(coping) 
        ? prev.filter(c => c !== coping)
        : [...prev, coping]
    );
  };

  // Testing functions
  const runNotificationTests = async () => {
    const results: Record<string, any> = {};
    
    try {
      console.log('🧪 Testing Notifications...');
      
      // Test 1: Permission Request
      const hasPermissions = await NotificationService.requestPermissions();
      results.permissions = hasPermissions;
      console.log('✅ Permissions:', hasPermissions ? 'Granted' : 'Denied');
      
      if (Platform.OS !== 'web') {
        // Test 2: Schedule Daily Reminder
        const dailyId = await NotificationService.scheduleDailyMoodCheck(9, 0);
        results.dailyScheduled = !!dailyId;
        console.log('✅ Daily reminder scheduled:', dailyId);
        
        // Test 3: Schedule Weekly Assessment
        const weeklyId = await NotificationService.scheduleWeeklyAssessment(1, 10);
        results.weeklyScheduled = !!weeklyId;
        console.log('✅ Weekly assessment scheduled:', weeklyId);
        
        // Test 4: Get Scheduled Notifications
        const scheduled = await NotificationService.getScheduledNotifications();
        results.totalScheduled = scheduled.length;
        console.log('✅ Scheduled notifications:', scheduled.length);
        
        // Test 5: Send immediate test notification
        try {
          await NotificationService.sendImmediateNotification(
            '🧪 Test Notification',
            'This is a test notification from the symptom tracker!'
          );
          results.immediateNotification = true;
          console.log('✅ Immediate notification sent');
        } catch (error) {
          results.immediateNotification = false;
          console.log('❌ Immediate notification failed:', error);
        }
        
        // Cleanup - cancel test notifications after 5 seconds
        setTimeout(async () => {
          await NotificationService.cancelAllNotifications();
          console.log('🧹 Test notifications cleaned up');
        }, 5000);
      } else {
        results.webLimitation = 'Notifications not supported on web platform';
        console.log('ℹ️ Web platform - notifications not supported');
      }
      
    } catch (error) {
      results.error = error.message;
      console.error('❌ Notification tests failed:', error);
    }
    
    return results;
  };

  const runAssessmentTests = async () => {
    const results: Record<string, any> = {};
    
    try {
      console.log('🧪 Testing Assessments...');
      
      // Test 1: Fetch Templates
      const templates = await SymptomService.getAssessmentTemplates();
      results.templatesLoaded = templates.length;
      console.log('✅ Templates loaded:', templates.length);
      
      if (templates.length > 0) {
        // Test 2: Submit Test Response
        const testResponses = {
          mood: 7,
          energy: 6,
          stress: 4
        };
        
        const response = await SymptomService.submitAssessmentResponse(
          templates[0].id,
          testResponses
        );
        results.responseSubmitted = !!response.id;
        results.calculatedScore = response.score;
        console.log('✅ Assessment submitted:', response.id, 'Score:', response.score);
        
        // Test 3: Fetch Responses
        const responses = await SymptomService.getAssessmentResponses(7);
        results.responsesFetched = responses.length;
        console.log('✅ Responses fetched:', responses.length);
      }
      
    } catch (error) {
      results.error = error.message;
      console.error('❌ Assessment tests failed:', error);
    }
    
    return results;
  };

  const runSymptomTests = async () => {
    const results: Record<string, any> = {};
    
    try {
      console.log('🧪 Testing Symptom Logging...');
      
      // Test 1: Get Categories
      const categories = await SymptomService.getSymptomCategories();
      results.categoriesLoaded = categories.length;
      console.log('✅ Categories loaded:', categories.length);
      
      if (categories.length > 0) {
        // Test 2: Log Test Symptom
        const testLog = await SymptomService.logSymptom({
          category_id: categories[0].id,
          severity: 6,
          notes: 'Test symptom log from automated testing',
          triggers: ['Stress', 'Testing'],
          coping_strategies: ['Deep breathing', 'Testing']
        });
        results.symptomLogged = !!testLog.id;
        console.log('✅ Symptom logged:', testLog.id);
        
        // Test 3: Fetch Recent Logs
        const logs = await SymptomService.getSymptomLogs(7);
        results.logsFetched = logs.length;
        console.log('✅ Logs fetched:', logs.length);
        
        // Test 4: Calculate Trends
        const trends = await SymptomService.getSymptomTrends(30);
        results.trendsCalculated = trends.length;
        console.log('✅ Trends calculated:', trends.length);
        
        // Test 5: Get Common Triggers/Coping
        const commonTriggers = await SymptomService.getCommonTriggers();
        const commonCoping = await SymptomService.getCommonCopingStrategies();
        results.commonTriggersFound = commonTriggers.length;
        results.commonCopingFound = commonCoping.length;
        console.log('✅ Common patterns found - Triggers:', commonTriggers.length, 'Coping:', commonCoping.length);
      }
      
    } catch (error) {
      results.error = error.message;
      console.error('❌ Symptom tests failed:', error);
    }
    
    return results;
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults({});
    
    try {
      console.log('🚀 Starting Comprehensive Test Suite...');
      
      const [notificationResults, assessmentResults, symptomResults] = await Promise.all([
        runNotificationTests(),
        runAssessmentTests(),
        runSymptomTests()
      ]);
      
      const allResults = {
        notifications: notificationResults,
        assessments: assessmentResults,
        symptoms: symptomResults,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        environment: __DEV__ ? 'development' : 'production'
      };
      
      setTestResults(allResults);
      console.log('🎉 All tests completed!', allResults);
      
      // Refresh data after tests
      await loadData();
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setIsRunningTests(false);
    }
  };

  const getSeverityColor = (severity: number): string => {
    if (severity <= 3) return '#10B981'; // Green
    if (severity <= 6) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getSeverityLabel = (severity: number): string => {
    if (severity <= 2) return 'Mild';
    if (severity <= 4) return 'Moderate';
    if (severity <= 7) return 'Severe';
    return 'Very Severe';
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'worsening') => {
    switch (trend) {
      case 'improving': return TrendingDown;
      case 'worsening': return TrendingUp;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'worsening'): string => {
    switch (trend) {
      case 'improving': return '#10B981';
      case 'worsening': return '#EF4444';
      default: return '#8E8E93';
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

  if (isLoading) {
    return (
      <SafeAreaView style={responsiveStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading symptom tracker...</Text>
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
                <Text style={responsiveStyles.title}>Symptom Tracker</Text>
                <Text style={responsiveStyles.subtitle}>
                  Monitor your mental health journey
                </Text>
              </View>
            </View>
            {/* Test Button */}
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => setShowTestModal(true)}
              activeOpacity={0.7}
            >
              <TestTube size={20} color="#8B5CF6" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={20} color="#FF3B30" strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Quick Log Section */}
        <View style={styles.section}>
          <Text style={responsiveStyles.sectionTitle}>Quick Log</Text>
          <View style={[
            styles.categoriesGrid,
            isWeb && isDesktop && {
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: isLargeDesktop ? 16 : 12,
            }
          ]}>
            {categories.map((category) => {
              const IconComponent = categoryIcons[category.icon] || Activity;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: `${category.color}15` },
                    isWeb && isDesktop && {
                      flex: isLargeDesktop ? '0 0 calc(25% - 12px)' : '0 0 calc(33.33% - 8px)',
                      maxWidth: isLargeDesktop ? 'calc(25% - 12px)' : 'calc(33.33% - 8px)',
                      borderRadius: 16,
                      padding: isLargeDesktop ? 20 : 18,
                    }
                  ]}
                  onPress={() => openLogModal(category)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.categoryIconContainer,
                    { backgroundColor: category.color },
                    isWeb && isDesktop && {
                      width: isLargeDesktop ? 48 : 44,
                      height: isLargeDesktop ? 48 : 44,
                      borderRadius: isLargeDesktop ? 24 : 22,
                    }
                  ]}>
                    <IconComponent 
                      size={isWeb && isDesktop ? (isLargeDesktop ? 24 : 22) : 20} 
                      color="#FFFFFF" 
                      strokeWidth={2} 
                    />
                  </View>
                  <Text style={[
                    styles.categoryName,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 16 : 15,
                    }
                  ]}>
                    {category.name}
                  </Text>
                  <TouchableOpacity style={styles.addButton}>
                    <Plus 
                      size={isWeb && isDesktop ? 18 : 16} 
                      color={category.color} 
                      strokeWidth={2} 
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={responsiveStyles.sectionTitle}>Recent Logs</Text>
              <Text style={styles.sectionSubtitle}>Last 7 days</Text>
            </View>
            <View style={styles.logsList}>
              {recentLogs.slice(0, 5).map((log) => {
                const IconComponent = categoryIcons[log.category.icon] || Activity;
                return (
                  <View key={log.id} style={styles.logCard}>
                    <View style={styles.logHeader}>
                      <View style={styles.logInfo}>
                        <View style={[
                          styles.logIconContainer,
                          { backgroundColor: log.category.color }
                        ]}>
                          <IconComponent 
                            size={16} 
                            color="#FFFFFF" 
                            strokeWidth={2} 
                          />
                        </View>
                        <View style={styles.logDetails}>
                          <Text style={styles.logCategory}>{log.category.name}</Text>
                          <Text style={styles.logTime}>
                            {new Date(log.logged_at).toLocaleDateString()} at{' '}
                            {new Date(log.logged_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Text>
                        </View>
                      </View>
                      <View style={[
                        styles.severityBadge,
                        { backgroundColor: getSeverityColor(log.severity) }
                      ]}>
                        <Text style={styles.severityText}>
                          {log.severity}/10
                        </Text>
                      </View>
                    </View>
                    
                    {log.notes && (
                      <Text style={styles.logNotes}>{log.notes}</Text>
                    )}
                    
                    {(log.triggers && log.triggers.length > 0) && (
                      <View style={styles.tagsContainer}>
                        <Text style={styles.tagsLabel}>Triggers:</Text>
                        <View style={styles.tags}>
                          {log.triggers.map((trigger, index) => (
                            <View key={index} style={[styles.tag, styles.triggerTag]}>
                              <Text style={styles.triggerTagText}>{trigger}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    
                    {(log.coping_strategies && log.coping_strategies.length > 0) && (
                      <View style={styles.tagsContainer}>
                        <Text style={styles.tagsLabel}>Coping:</Text>
                        <View style={styles.tags}>
                          {log.coping_strategies.map((strategy, index) => (
                            <View key={index} style={[styles.tag, styles.copingTag]}>
                              <Text style={styles.copingTagText}>{strategy}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Trends */}
        {trends.length > 0 && (
          <View style={styles.section}>
            <Text style={responsiveStyles.sectionTitle}>Trends</Text>
            <View style={styles.trendsList}>
              {trends.map((trend) => {
                const TrendIcon = getTrendIcon(trend.trend);
                const trendColor = getTrendColor(trend.trend);
                
                return (
                  <View key={trend.category} style={styles.trendCard}>
                    <View style={styles.trendHeader}>
                      <Text style={styles.trendCategory}>{trend.category}</Text>
                      <View style={styles.trendIndicator}>
                        <TrendIcon size={16} color={trendColor} strokeWidth={2} />
                        <Text style={[styles.trendText, { color: trendColor }]}>
                          {trend.trend === 'stable' ? 'Stable' : 
                           trend.trend === 'improving' ? 'Improving' : 'Worsening'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.trendStats}>
                      <Text style={styles.trendAverage}>
                        Avg: {trend.averageSeverity.toFixed(1)}/10
                      </Text>
                      <Text style={styles.trendChange}>
                        {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Quick Assessments */}
        {assessmentTemplates.length > 0 && (
          <View style={styles.section}>
            <Text style={responsiveStyles.sectionTitle}>Quick Assessments</Text>
            <View style={styles.assessmentsList}>
              {assessmentTemplates.slice(0, 2).map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.assessmentCard}
                  onPress={() => {
                    setSelectedAssessment(template);
                    setShowAssessmentModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.assessmentContent}>
                    <View style={styles.assessmentIcon}>
                      <BarChart3 size={24} color="#007AFF" strokeWidth={2} />
                    </View>
                    <View style={styles.assessmentInfo}>
                      <Text style={styles.assessmentName}>{template.name}</Text>
                      <Text style={styles.assessmentDescription}>
                        {template.description}
                      </Text>
                      <Text style={styles.assessmentFrequency}>
                        {template.frequency} • {template.target_audience}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {recentLogs.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Activity size={48} color="#8E8E93" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyStateTitle}>Start Tracking</Text>
            <Text style={styles.emptyStateSubtitle}>
              Log your first symptom to begin monitoring your mental health journey
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Log Symptom Modal */}
      <Modal
        visible={showLogModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeLogModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeLogModal}>
              <X size={24} color="#8E8E93" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Log {selectedCategory?.name}
            </Text>
            <TouchableOpacity onPress={submitSymptomLog}>
              <Check size={24} color="#007AFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Severity Slider */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Severity Level</Text>
              <View style={styles.severityContainer}>
                <View style={styles.severitySlider}>
                  <View style={styles.severityTrack}>
                    <View 
                      style={[
                        styles.severityFill,
                        { 
                          width: `${(severity / 10) * 100}%`,
                          backgroundColor: getSeverityColor(severity)
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.severityLabels}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.severityDot,
                          severity === value && styles.severityDotActive,
                          { backgroundColor: severity === value ? getSeverityColor(severity) : '#E5E5EA' }
                        ]}
                        onPress={() => setSeverity(value)}
                      >
                        <Text style={[
                          styles.severityDotText,
                          severity === value && styles.severityDotTextActive
                        ]}>
                          {value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.severityInfo}>
                  <Text style={[styles.severityValue, { color: getSeverityColor(severity) }]}>
                    {severity}/10
                  </Text>
                  <Text style={styles.severityLabel}>
                    {getSeverityLabel(severity)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="How are you feeling? What's happening?"
                placeholderTextColor="#8E8E93"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Triggers */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Triggers (Optional)</Text>
              <View style={styles.tagsGrid}>
                {commonTriggers.map((trigger) => (
                  <TouchableOpacity
                    key={trigger}
                    style={[
                      styles.tagButton,
                      selectedTriggers.includes(trigger) && styles.tagButtonSelected
                    ]}
                    onPress={() => toggleTrigger(trigger)}
                  >
                    <Text style={[
                      styles.tagButtonText,
                      selectedTriggers.includes(trigger) && styles.tagButtonTextSelected
                    ]}>
                      {trigger}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.customInput}
                placeholder="Add custom trigger..."
                placeholderTextColor="#8E8E93"
                value={customTrigger}
                onChangeText={setCustomTrigger}
              />
            </View>

            {/* Coping Strategies */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Coping Strategies (Optional)</Text>
              <View style={styles.tagsGrid}>
                {commonCoping.map((coping) => (
                  <TouchableOpacity
                    key={coping}
                    style={[
                      styles.tagButton,
                      selectedCoping.includes(coping) && styles.tagButtonSelected
                    ]}
                    onPress={() => toggleCoping(coping)}
                  >
                    <Text style={[
                      styles.tagButtonText,
                      selectedCoping.includes(coping) && styles.tagButtonTextSelected
                    ]}>
                      {coping}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.customInput}
                placeholder="Add custom coping strategy..."
                placeholderTextColor="#8E8E93"
                value={customCoping}
                onChangeText={setCustomCoping}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Test Modal */}
      <Modal
        visible={showTestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTestModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTestModal(false)}>
              <X size={24} color="#8E8E93" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Feature Testing</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.testSection}>
              <Text style={styles.testSectionTitle}>🧪 Test Suite</Text>
              <Text style={styles.testSectionDescription}>
                Run comprehensive tests for notifications, assessments, and symptom logging.
              </Text>
              
              <TouchableOpacity
                style={[styles.testRunButton, isRunningTests && styles.testRunButtonDisabled]}
                onPress={runAllTests}
                disabled={isRunningTests}
                activeOpacity={0.7}
              >
                {isRunningTests ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <TestTube size={20} color="#FFFFFF" strokeWidth={2} />
                )}
                <Text style={styles.testRunButtonText}>
                  {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
                </Text>
              </TouchableOpacity>

              {Object.keys(testResults).length > 0 && (
                <View style={styles.testResults}>
                  <Text style={styles.testResultsTitle}>Test Results</Text>
                  <ScrollView style={styles.testResultsScroll}>
                    <Text style={styles.testResultsText}>
                      {JSON.stringify(testResults, null, 2)}
                    </Text>
                  </ScrollView>
                </View>
              )}

              <View style={styles.testInfo}>
                <Text style={styles.testInfoTitle}>Testing Information</Text>
                <Text style={styles.testInfoText}>
                  • <Text style={styles.testInfoBold}>Notifications:</Text> {Platform.OS === 'web' ? 'Limited on web - use mobile device for full testing' : 'Full testing available on mobile'}
                </Text>
                <Text style={styles.testInfoText}>
                  • <Text style={styles.testInfoBold}>Assessments:</Text> Fully functional in all environments
                </Text>
                <Text style={styles.testInfoText}>
                  • <Text style={styles.testInfoBold}>Symptom Logging:</Text> Fully functional with database integration
                </Text>
                <Text style={styles.testInfoText}>
                  • <Text style={styles.testInfoBold}>Platform:</Text> {Platform.OS} ({__DEV__ ? 'development' : 'production'})
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default function SymptomsScreen() {
  return (
    <RoleGuard 
      allowedRoles={['patient']} 
      fallbackMessage="Symptom tracking is designed for patients to monitor their mental health."
    >
      <SymptomsContent />
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 8,
    flex: 1,
  },
  header: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  testButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3F0FF',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsList: {
    gap: 12,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logDetails: {
    flex: 1,
  },
  logCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  logTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logNotes: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 8,
  },
  tagsContainer: {
    marginBottom: 8,
  },
  tagsLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  triggerTag: {
    backgroundColor: '#FFEBEE',
  },
  triggerTagText: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: '500',
  },
  copingTag: {
    backgroundColor: '#E8F5E8',
  },
  copingTagText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '500',
  },
  trendsList: {
    gap: 12,
  },
  trendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  trendStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendAverage: {
    fontSize: 14,
    color: '#8E8E93',
  },
  trendChange: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  assessmentsList: {
    gap: 12,
  },
  assessmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  assessmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assessmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  assessmentDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 4,
  },
  assessmentFrequency: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  severityContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  severitySlider: {
    marginBottom: 16,
  },
  severityTrack: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 16,
  },
  severityFill: {
    height: '100%',
    borderRadius: 2,
  },
  severityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityDotActive: {
    transform: [{ scale: 1.2 }],
  },
  severityDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  severityDotTextActive: {
    color: '#FFFFFF',
  },
  severityInfo: {
    alignItems: 'center',
  },
  severityValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  severityLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tagButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagButtonText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  tagButtonTextSelected: {
    color: '#FFFFFF',
  },
  customInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  testSection: {
    padding: 20,
  },
  testSectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  testSectionDescription: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
    marginBottom: 24,
  },
  testRunButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  testRunButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  testRunButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  testResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  testResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  testResultsScroll: {
    maxHeight: 200,
  },
  testResultsText: {
    fontSize: 12,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  testInfo: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  testInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  testInfoText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
    marginBottom: 4,
  },
  testInfoBold: {
    fontWeight: '600',
  },
});