import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import { 
  Activity, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Clock, 
  Target, 
  ChartBar as BarChart3, 
  CircleAlert as AlertCircle, 
  Heart, 
  Zap, 
  Battery, 
  Moon, 
  Users, 
  Utensils,
  User,
  Mail,
  Brain,
  Copy,
  Share2,
  Sparkles
} from 'lucide-react-native';
import { RoleGuard } from '@/components/RoleGuard';
import { router, useLocalSearchParams } from 'expo-router';
import {
  SymptomService,
  SymptomLogWithCategory,
  SymptomTrend,
} from '@/lib/symptomService';
import { SupabaseService, UserProfile } from '@/lib/supabaseService';
import { LLMService } from '@/lib/llmService';
import * as Clipboard from 'expo-clipboard';

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

function PatientSymptomsContent() {
  const { patientId, patientName, patientEmail } = useLocalSearchParams();
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [patient, setPatient] = useState<UserProfile | null>(null);
  const [recentLogs, setRecentLogs] = useState<SymptomLogWithCategory[]>([]);
  const [trends, setTrends] = useState<SymptomTrend[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);

  // LLM Summary state
  const [llmSummary, setLlmSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId, selectedPeriod]);

  const loadPatientData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!patientId || typeof patientId !== 'string') {
        throw new Error('Patient ID is required');
      }

      // Load patient profile if not provided in params
      if (!patient && (!patientName || !patientEmail)) {
        const patients = await SupabaseService.getPatientsForProvider(
          (await SupabaseService.getCurrentUser())?.id || ''
        );
        const foundPatient = patients.find(p => p.id === patientId);
        if (foundPatient) {
          setPatient(foundPatient);
        }
      }

      const [logsData, trendsData] = await Promise.all([
        SymptomService.getSymptomLogsForPatient(patientId, selectedPeriod),
        SymptomService.getSymptomTrendsForPatient(patientId, selectedPeriod),
      ]);

      setRecentLogs(logsData);
      setTrends(trendsData);
    } catch (err: any) {
      console.error('Error loading patient symptom data:', err);
      setError(err.message || 'Failed to load patient symptom data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadPatientData();
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [patientId, selectedPeriod]);

  const handleGenerateSummary = async () => {
    if (!patientId || typeof patientId !== 'string') {
      setSummaryError('Patient ID is required');
      return;
    }

    try {
      setIsSummarizing(true);
      setSummaryError(null);
      setLlmSummary(null);

      console.log('Generating summary for patient:', patientId);

      const summary = await LLMService.generatePatientSummary(patientId, selectedPeriod);
      setLlmSummary(summary);

      console.log('Summary generated successfully');
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setSummaryError(err.message || 'Failed to generate patient summary');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopySummary = async () => {
    if (!llmSummary) return;

    try {
      if (Platform.OS === 'web') {
        // Web clipboard API
        await navigator.clipboard.writeText(llmSummary);
      } else {
        // Mobile clipboard
        await Clipboard.setStringAsync(llmSummary);
      }

      // Show success feedback
      if (Platform.OS === 'web') {
        // For web, we could show a toast or temporary message
        console.log('Summary copied to clipboard');
      } else {
        Alert.alert('Success', 'Summary copied to clipboard');
      }
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      Alert.alert('Error', 'Failed to copy summary to clipboard');
    }
  };

  const handleShareSummary = async () => {
    if (!llmSummary) return;

    try {
      if (Platform.OS === 'web') {
        // Web Share API (if supported) or fallback to copy
        if (navigator.share) {
          await navigator.share({
            title: 'Patient Summary',
            text: llmSummary,
          });
        } else {
          // Fallback to copy on web
          await handleCopySummary();
        }
      } else {
        // Mobile sharing would require expo-sharing
        // For now, fallback to copy
        await handleCopySummary();
      }
    } catch (err) {
      console.error('Error sharing summary:', err);
      Alert.alert('Error', 'Failed to share summary');
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
          fontSize: isLargeDesktop ? 36 : 32,
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
          fontSize: 32,
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

  const displayName = patient?.full_name || patientName || 'Patient';
  const displayEmail = patient?.email || patientEmail || '';

  if (isLoading) {
    return (
      <SafeAreaView style={responsiveStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading patient symptom data...</Text>
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft 
                size={isWeb && isDesktop ? 28 : 24} 
                color="#007AFF" 
                strokeWidth={2} 
              />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={responsiveStyles.title}>Patient Symptoms</Text>
              <Text style={responsiveStyles.subtitle}>
                Mental health tracking and insights
              </Text>
            </View>
          </View>
        </View>

        {/* Patient Info */}
        <View style={[
          styles.patientInfoCard,
          isWeb && isDesktop && {
            borderRadius: 20,
            padding: isLargeDesktop ? 28 : 24,
          }
        ]}>
          <View style={styles.patientInfoHeader}>
            <View style={[
              styles.patientAvatar,
              isWeb && isDesktop && {
                width: isLargeDesktop ? 64 : 60,
                height: isLargeDesktop ? 64 : 60,
                borderRadius: isLargeDesktop ? 32 : 30,
              }
            ]}>
              <User 
                size={isWeb && isDesktop ? (isLargeDesktop ? 32 : 30) : 28} 
                color="#007AFF" 
                strokeWidth={2} 
              />
            </View>
            <View style={styles.patientDetails}>
              <Text style={[
                styles.patientName,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 24 : 22,
                }
              ]}>
                {displayName}
              </Text>
              <View style={styles.patientEmailContainer}>
                <Mail 
                  size={isWeb && isDesktop ? 18 : 16} 
                  color="#8E8E93" 
                  strokeWidth={2} 
                />
                <Text style={[
                  styles.patientEmail,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 16 : 15,
                  }
                ]}>
                  {displayEmail}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={20} color="#FF3B30" strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* AI Summary Section */}
        <View style={[
          styles.summarySection,
          isWeb && isDesktop && {
            borderRadius: 20,
            padding: isLargeDesktop ? 28 : 24,
          }
        ]}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTitleContainer}>
              <View style={[
                styles.summaryIconContainer,
                isWeb && isDesktop && {
                  width: isLargeDesktop ? 48 : 44,
                  height: isLargeDesktop ? 48 : 44,
                  borderRadius: isLargeDesktop ? 24 : 22,
                }
              ]}>
                <Brain 
                  size={isWeb && isDesktop ? (isLargeDesktop ? 24 : 22) : 20} 
                  color="#FFFFFF" 
                  strokeWidth={2} 
                />
              </View>
              <View>
                <Text style={[
                  styles.summaryTitle,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 22 : 20,
                  }
                ]}>
                  AI Patient Summary
                </Text>
                <Text style={[
                  styles.summarySubtitle,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 14 : 13,
                  }
                ]}>
                  Comprehensive analysis of {selectedPeriod}-day period
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[
                styles.generateButton,
                isSummarizing && styles.generateButtonDisabled,
                isWeb && isDesktop && {
                  paddingHorizontal: isLargeDesktop ? 20 : 18,
                  paddingVertical: isLargeDesktop ? 12 : 10,
                  borderRadius: 12,
                }
              ]}
              onPress={handleGenerateSummary}
              disabled={isSummarizing}
              activeOpacity={0.7}
            >
              {isSummarizing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Sparkles 
                    size={isWeb && isDesktop ? 18 : 16} 
                    color="#FFFFFF" 
                    strokeWidth={2} 
                  />
                  <Text style={[
                    styles.generateButtonText,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 16 : 15,
                    }
                  ]}>
                    Generate
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Summary Content */}
          {summaryError && (
            <View style={styles.summaryErrorContainer}>
              <AlertCircle size={20} color="#FF3B30" strokeWidth={2} />
              <Text style={styles.summaryErrorText}>{summaryError}</Text>
            </View>
          )}

          {llmSummary && (
            <View style={styles.summaryContent}>
              <Text style={[
                styles.summaryText,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 16 : 15,
                  lineHeight: isLargeDesktop ? 24 : 22,
                }
              ]}>
                {llmSummary}
              </Text>
              
              <View style={styles.summaryActions}>
                <TouchableOpacity
                  style={[
                    styles.summaryActionButton,
                    isWeb && isDesktop && {
                      paddingHorizontal: isLargeDesktop ? 16 : 14,
                      paddingVertical: isLargeDesktop ? 10 : 8,
                      borderRadius: 10,
                    }
                  ]}
                  onPress={handleCopySummary}
                  activeOpacity={0.7}
                >
                  <Copy 
                    size={isWeb && isDesktop ? 16 : 14} 
                    color="#007AFF" 
                    strokeWidth={2} 
                  />
                  <Text style={[
                    styles.summaryActionText,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 14 : 13,
                    }
                  ]}>
                    Copy
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.summaryActionButton,
                    isWeb && isDesktop && {
                      paddingHorizontal: isLargeDesktop ? 16 : 14,
                      paddingVertical: isLargeDesktop ? 10 : 8,
                      borderRadius: 10,
                    }
                  ]}
                  onPress={handleShareSummary}
                  activeOpacity={0.7}
                >
                  <Share2 
                    size={isWeb && isDesktop ? 16 : 14} 
                    color="#007AFF" 
                    strokeWidth={2} 
                  />
                  <Text style={[
                    styles.summaryActionText,
                    isWeb && isDesktop && {
                      fontSize: isLargeDesktop ? 14 : 13,
                    }
                  ]}>
                    Share
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!llmSummary && !summaryError && !isSummarizing && (
            <View style={styles.summaryPlaceholder}>
              <Text style={[
                styles.summaryPlaceholderText,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 16 : 15,
                }
              ]}>
                Click "Generate" to create an AI-powered summary of this patient's mental health data, including symptom trends, task completion, and clinical insights.
              </Text>
            </View>
          )}
        </View>

        {/* Period Selection */}
        <View style={styles.periodSelector}>
          <Text style={[
            styles.periodLabel,
            isWeb && isDesktop && {
              fontSize: isLargeDesktop ? 18 : 16,
            }
          ]}>
            Time Period:
          </Text>
          <View style={styles.periodButtons}>
            {[7, 30, 90].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                  isWeb && isDesktop && {
                    paddingHorizontal: isLargeDesktop ? 20 : 18,
                    paddingVertical: isLargeDesktop ? 12 : 10,
                    borderRadius: 12,
                  }
                ]}
                onPress={() => setSelectedPeriod(period as 7 | 30 | 90)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 16 : 15,
                  }
                ]}>
                  {period} days
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary Stats */}
        {recentLogs.length > 0 && (
          <View style={[
            styles.summaryCard,
            isWeb && isDesktop && {
              borderRadius: 20,
              padding: isLargeDesktop ? 28 : 24,
            }
          ]}>
            <Text style={[
              styles.summaryCardTitle,
              isWeb && isDesktop && {
                fontSize: isLargeDesktop ? 22 : 20,
              }
            ]}>
              Summary ({selectedPeriod} days)
            </Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={[
                  styles.summaryStatValue,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 28 : 24,
                  }
                ]}>
                  {recentLogs.length}
                </Text>
                <Text style={[
                  styles.summaryStatLabel,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 14 : 13,
                  }
                ]}>
                  Total Logs
                </Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[
                  styles.summaryStatValue,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 28 : 24,
                  }
                ]}>
                  {(recentLogs.reduce((sum, log) => sum + log.severity, 0) / recentLogs.length).toFixed(1)}
                </Text>
                <Text style={[
                  styles.summaryStatLabel,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 14 : 13,
                  }
                ]}>
                  Avg Severity
                </Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[
                  styles.summaryStatValue,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 28 : 24,
                  }
                ]}>
                  {new Set(recentLogs.map(log => log.category.name)).size}
                </Text>
                <Text style={[
                  styles.summaryStatLabel,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 14 : 13,
                  }
                ]}>
                  Categories
                </Text>
              </View>
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
                  <View key={trend.category} style={[
                    styles.trendCard,
                    isWeb && isDesktop && {
                      borderRadius: 16,
                      padding: isLargeDesktop ? 20 : 18,
                    }
                  ]}>
                    <View style={styles.trendHeader}>
                      <Text style={[
                        styles.trendCategory,
                        isWeb && isDesktop && {
                          fontSize: isLargeDesktop ? 18 : 16,
                        }
                      ]}>
                        {trend.category}
                      </Text>
                      <View style={styles.trendIndicator}>
                        <TrendIcon 
                          size={isWeb && isDesktop ? 18 : 16} 
                          color={trendColor} 
                          strokeWidth={2} 
                        />
                        <Text style={[
                          styles.trendText,
                          { color: trendColor },
                          isWeb && isDesktop && {
                            fontSize: isLargeDesktop ? 16 : 14,
                          }
                        ]}>
                          {trend.trend === 'stable' ? 'Stable' : 
                           trend.trend === 'improving' ? 'Improving' : 'Worsening'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.trendStats}>
                      <Text style={[
                        styles.trendAverage,
                        isWeb && isDesktop && {
                          fontSize: isLargeDesktop ? 16 : 14,
                        }
                      ]}>
                        Avg: {trend.averageSeverity.toFixed(1)}/10
                      </Text>
                      <Text style={[
                        styles.trendChange,
                        isWeb && isDesktop && {
                          fontSize: isLargeDesktop ? 16 : 14,
                        }
                      ]}>
                        {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={responsiveStyles.sectionTitle}>Recent Logs</Text>
              <Text style={[
                styles.sectionSubtitle,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 16 : 14,
                }
              ]}>
                Last {selectedPeriod} days
              </Text>
            </View>
            <View style={styles.logsList}>
              {recentLogs.slice(0, 10).map((log) => {
                const IconComponent = categoryIcons[log.category.icon] || Activity;
                return (
                  <View key={log.id} style={[
                    styles.logCard,
                    isWeb && isDesktop && {
                      borderRadius: 16,
                      padding: isLargeDesktop ? 20 : 18,
                    }
                  ]}>
                    <View style={styles.logHeader}>
                      <View style={styles.logInfo}>
                        <View style={[
                          styles.logIconContainer,
                          { backgroundColor: log.category.color },
                          isWeb && isDesktop && {
                            width: isLargeDesktop ? 40 : 36,
                            height: isLargeDesktop ? 40 : 36,
                            borderRadius: isLargeDesktop ? 20 : 18,
                          }
                        ]}>
                          <IconComponent 
                            size={isWeb && isDesktop ? (isLargeDesktop ? 20 : 18) : 16} 
                            color="#FFFFFF" 
                            strokeWidth={2} 
                          />
                        </View>
                        <View style={styles.logDetails}>
                          <Text style={[
                            styles.logCategory,
                            isWeb && isDesktop && {
                              fontSize: isLargeDesktop ? 18 : 16,
                            }
                          ]}>
                            {log.category.name}
                          </Text>
                          <Text style={[
                            styles.logTime,
                            isWeb && isDesktop && {
                              fontSize: isLargeDesktop ? 14 : 12,
                            }
                          ]}>
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
                        { backgroundColor: getSeverityColor(log.severity) },
                        isWeb && isDesktop && {
                          paddingHorizontal: isLargeDesktop ? 12 : 10,
                          paddingVertical: isLargeDesktop ? 6 : 5,
                          borderRadius: 10,
                        }
                      ]}>
                        <Text style={[
                          styles.severityText,
                          isWeb && isDesktop && {
                            fontSize: isLargeDesktop ? 14 : 12,
                          }
                        ]}>
                          {log.severity}/10
                        </Text>
                      </View>
                    </View>
                    
                    {log.notes && (
                      <Text style={[
                        styles.logNotes,
                        isWeb && isDesktop && {
                          fontSize: isLargeDesktop ? 16 : 14,
                        }
                      ]}>
                        {log.notes}
                      </Text>
                    )}
                    
                    {(log.triggers && log.triggers.length > 0) && (
                      <View style={styles.tagsContainer}>
                        <Text style={[
                          styles.tagsLabel,
                          isWeb && isDesktop && {
                            fontSize: isLargeDesktop ? 14 : 12,
                          }
                        ]}>
                          Triggers:
                        </Text>
                        <View style={styles.tags}>
                          {log.triggers.map((trigger, index) => (
                            <View key={index} style={[
                              styles.tag, 
                              styles.triggerTag,
                              isWeb && isDesktop && {
                                paddingHorizontal: isLargeDesktop ? 10 : 8,
                                paddingVertical: isLargeDesktop ? 6 : 4,
                                borderRadius: 8,
                              }
                            ]}>
                              <Text style={[
                                styles.triggerTagText,
                                isWeb && isDesktop && {
                                  fontSize: isLargeDesktop ? 12 : 11,
                                }
                              ]}>
                                {trigger}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    
                    {(log.coping_strategies && log.coping_strategies.length > 0) && (
                      <View style={styles.tagsContainer}>
                        <Text style={[
                          styles.tagsLabel,
                          isWeb && isDesktop && {
                            fontSize: isLargeDesktop ? 14 : 12,
                          }
                        ]}>
                          Coping:
                        </Text>
                        <View style={styles.tags}>
                          {log.coping_strategies.map((strategy, index) => (
                            <View key={index} style={[
                              styles.tag, 
                              styles.copingTag,
                              isWeb && isDesktop && {
                                paddingHorizontal: isLargeDesktop ? 10 : 8,
                                paddingVertical: isLargeDesktop ? 6 : 4,
                                borderRadius: 8,
                              }
                            ]}>
                              <Text style={[
                                styles.copingTagText,
                                isWeb && isDesktop && {
                                  fontSize: isLargeDesktop ? 12 : 11,
                                }
                              ]}>
                                {strategy}
                              </Text>
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

        {/* Empty State */}
        {recentLogs.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[
              styles.emptyStateIcon,
              isWeb && isDesktop && {
                width: isLargeDesktop ? 120 : 110,
                height: isLargeDesktop ? 120 : 110,
                borderRadius: isLargeDesktop ? 60 : 55,
              }
            ]}>
              <Activity 
                size={isWeb && isDesktop ? (isLargeDesktop ? 56 : 52) : 48} 
                color="#8E8E93" 
                strokeWidth={1.5} 
              />
            </View>
            <Text style={[
              styles.emptyStateTitle,
              isWeb && isDesktop && {
                fontSize: isLargeDesktop ? 28 : 26,
              }
            ]}>
              No Symptom Logs
            </Text>
            <Text style={[
              styles.emptyStateSubtitle,
              isWeb && isDesktop && {
                fontSize: isLargeDesktop ? 18 : 16,
              }
            ]}>
              This patient hasn't logged any symptoms in the selected time period.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[
            styles.footerText,
            isWeb && isDesktop && {
              fontSize: isLargeDesktop ? 14 : 13,
            }
          ]}>
            Patient data is confidential and HIPAA compliant
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function PatientSymptomsScreen() {
  return (
    <RoleGuard 
      allowedRoles={['provider']} 
      fallbackMessage="Patient symptom logs are only accessible to healthcare providers."
    >
      <PatientSymptomsContent />
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
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
  },
  patientInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
  },
  patientInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  patientEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
    fontWeight: '500',
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
  summarySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#8E8E93',
    shadowOpacity: 0,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  summaryErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  summaryErrorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  summaryContent: {
    marginTop: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 16,
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  summaryActionText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  summaryPlaceholder: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  summaryPlaceholderText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    textAlign: 'center',
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