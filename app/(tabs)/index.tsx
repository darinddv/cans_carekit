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
  RefreshControl,
  Dimensions
} from 'react-native';
import { Heart, Check, Clock, CircleAlert as AlertCircle, Wifi, WifiOff, RefreshCw, LogOut } from 'lucide-react-native';
import { SupabaseService, CareTask } from '@/lib/supabaseService';
import { taskStorage } from '@/lib/taskStorage';
import { router } from 'expo-router';

export default function CareCardScreen() {
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  // Load tasks and initialize sync on component mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Real-time subscription effect
  useEffect(() => {
    if (!currentUserId || !isOnline) return;

    console.log('Setting up real-time subscription for user:', currentUserId);
    
    // Subscribe to real-time changes
    const unsubscribe = taskStorage.subscribeToChanges?.(
      (updatedTasks: CareTask[]) => {
        console.log('Received real-time task update:', updatedTasks.length, 'tasks');
        setTasks(updatedTasks);
        
        // Update last sync time for mobile
        if (Platform.OS !== 'web') {
          taskStorage.getLastSyncTime?.().then(setLastSyncTime);
        }
      },
      currentUserId
    );

    // Cleanup subscription on unmount or dependency change
    return () => {
      if (unsubscribe) {
        console.log('Cleaning up real-time subscription');
        unsubscribe();
      }
    };
  }, [currentUserId, isOnline]);

  // Auto-sync every 30 seconds when online (mobile only)
  useEffect(() => {
    if (!isOnline || Platform.OS === 'web' || !currentUserId) return;

    const syncInterval = setInterval(() => {
      handleBackgroundSync();
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [isOnline, currentUserId]);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check authentication first
      const isAuthenticated = await SupabaseService.isAuthenticated();
      if (!isAuthenticated) {
        router.replace('/login');
        return;
      }

      const user = await SupabaseService.getCurrentUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Load tasks using the abstracted storage
      const loadedTasks = await taskStorage.getTasks(user.id);
      setTasks(loadedTasks);

      // Perform initial sync
      await performSync(user.id, true);
      
      // Load last sync time
      const lastSync = await taskStorage.getLastSyncTime?.();
      setLastSyncTime(lastSync);

    } catch (err) {
      console.error('Error initializing app:', err);
      setError('Failed to initialize app. Using offline mode.');
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  const performSync = async (userId: string, isInitialSync: boolean = false) => {
    try {
      if (!isInitialSync) {
        setIsSyncing(true);
      }

      // Check if user is authenticated
      const isAuthenticated = await SupabaseService.isAuthenticated();
      if (!isAuthenticated) {
        setIsOnline(false);
        router.replace('/login');
        return;
      }

      // Use the abstracted sync method
      await taskStorage.syncWithServer?.(userId);
      
      // Reload tasks after sync
      const syncedTasks = await taskStorage.getTasks(userId);
      setTasks(syncedTasks);

      // Update last sync time
      const lastSync = await taskStorage.getLastSyncTime?.();
      setLastSyncTime(lastSync);

      setIsOnline(true);
      setError(null);
    } catch (err) {
      console.error('Error syncing:', err);
      setIsOnline(false);
      if (isInitialSync) {
        setError('Unable to sync with cloud. Working offline.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBackgroundSync = async () => {
    try {
      const user = await SupabaseService.getCurrentUser();
      if (user) {
        await performSync(user.id, false);
      }
    } catch (err) {
      console.error('Background sync failed:', err);
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const user = await SupabaseService.getCurrentUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const updatedTasks = tasks.map(task =>
        task.id === taskId
          ? { 
              ...task, 
              completed: !task.completed,
              updated_at: new Date().toISOString()
            }
          : task
      );

      // Update local state immediately for responsive UI
      setTasks(updatedTasks);

      // Save using the abstracted storage
      const updatedTask = updatedTasks.find(task => task.id === taskId);
      if (updatedTask) {
        await taskStorage.saveTask(updatedTask);
        
        // Update last sync time if available
        const lastSync = await taskStorage.getLastSyncTime?.();
        setLastSyncTime(lastSync);
      }

    } catch (err) {
      console.error('Error toggling task completion:', err);
      setError('Failed to update task.');
      
      // Revert the optimistic update on error
      const revertedTasks = tasks.map(task =>
        task.id === taskId
          ? { ...task, completed: !task.completed }
          : task
      );
      setTasks(revertedTasks);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const user = await SupabaseService.getCurrentUser();
      if (user) {
        await performSync(user.id, false);
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleManualSync = async () => {
    try {
      const user = await SupabaseService.getCurrentUser();
      if (user) {
        await performSync(user.id, false);
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await SupabaseService.signOut();
      // Navigation will be handled by the auth state change in _layout.tsx
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out. Please try again.');
    }
  };

  const completedTasksCount = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;

  const formatLastSyncTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
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
        progressTitle: {
          ...baseStyles.progressTitle,
          fontSize: isLargeDesktop ? 22 : 20,
        },
        taskTitle: {
          ...baseStyles.taskTitle,
          fontSize: isLargeDesktop ? 20 : 18,
        },
        taskTime: {
          ...baseStyles.taskTime,
          fontSize: isLargeDesktop ? 16 : 15,
        },
        noTasksTitle: {
          ...baseStyles.noTasksTitle,
          fontSize: isLargeDesktop ? 28 : 26,
        },
        noTasksSubtitle: {
          ...baseStyles.noTasksSubtitle,
          fontSize: isLargeDesktop ? 18 : 16,
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
        <View style={[
          styles.loadingContainer,
          isWeb && isDesktop && {
            maxWidth: isLargeDesktop ? 1200 : 1000,
            alignSelf: 'center',
          }
        ]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[
            styles.loadingText,
            isWeb && isDesktop && {
              fontSize: isLargeDesktop ? 18 : 16,
            }
          ]}>Loading your care tasks...</Text>
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
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Heart 
                size={isWeb && isDesktop ? (isLargeDesktop ? 40 : 36) : 32} 
                color="#007AFF" 
                strokeWidth={2} 
              />
              <Text style={responsiveStyles.title}>Care Card</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.signOutButton,
                isWeb && isDesktop && {
                  padding: 12,
                  borderRadius: 12,
                }
              ]}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <LogOut 
                size={isWeb && isDesktop ? 24 : 20} 
                color="#FF3B30" 
                strokeWidth={2} 
              />
            </TouchableOpacity>
          </View>
          <Text style={responsiveStyles.subtitle}>
            Your personalized care plan and daily tasks
          </Text>
        </View>

        {/* Sync Status */}
        <View style={[
          styles.syncStatusContainer,
          isWeb && isDesktop && {
            borderRadius: 16,
            padding: isLargeDesktop ? 20 : 18,
          }
        ]}>
          <View style={styles.syncStatus}>
            {isOnline ? (
              <Wifi 
                size={isWeb && isDesktop ? 18 : 16} 
                color="#34C759" 
                strokeWidth={2} 
              />
            ) : (
              <WifiOff 
                size={isWeb && isDesktop ? 18 : 16} 
                color="#FF9500" 
                strokeWidth={2} 
              />
            )}
            <Text style={[
              styles.syncStatusText,
              { color: isOnline ? '#34C759' : '#FF9500' },
              isWeb && isDesktop && {
                fontSize: isLargeDesktop ? 16 : 15,
              }
            ]}>
              {isOnline ? (Platform.OS === 'web' ? 'Live' : 'Online') : 'Offline'}
            </Text>
            {Platform.OS !== 'web' && (
              <Text style={[
                styles.lastSyncText,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 14 : 13,
                }
              ]}>
                Last sync: {formatLastSyncTime(lastSyncTime)}
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={[
              styles.syncButton,
              isWeb && isDesktop && {
                padding: 12,
                borderRadius: 12,
              }
            ]}
            onPress={handleManualSync}
            disabled={isSyncing || !isOnline}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <RefreshCw 
                size={isWeb && isDesktop ? 18 : 16} 
                color={isOnline ? "#007AFF" : "#8E8E93"} 
                strokeWidth={2} 
              />
            )}
          </TouchableOpacity>
        </View>

        {error && (
          <View style={[
            styles.errorContainer,
            isWeb && isDesktop && {
              borderRadius: 16,
              padding: isLargeDesktop ? 20 : 18,
            }
          ]}>
            <AlertCircle 
              size={isWeb && isDesktop ? 24 : 20} 
              color="#FF3B30" 
              strokeWidth={2} 
            />
            <Text style={[
              styles.errorText,
              isWeb && isDesktop && {
                fontSize: isLargeDesktop ? 16 : 15,
              }
            ]}>{error}</Text>
          </View>
        )}

        {/* Show "No tasks assigned" message if no tasks */}
        {tasks.length === 0 ? (
          <View style={[
            styles.noTasksContainer,
            isWeb && isDesktop && {
              paddingVertical: isLargeDesktop ? 80 : 70,
              paddingHorizontal: isLargeDesktop ? 60 : 50,
            }
          ]}>
            <View style={[
              styles.noTasksIcon,
              isWeb && isDesktop && {
                width: isLargeDesktop ? 120 : 110,
                height: isLargeDesktop ? 120 : 110,
                borderRadius: isLargeDesktop ? 60 : 55,
              }
            ]}>
              <Heart 
                size={isWeb && isDesktop ? (isLargeDesktop ? 60 : 56) : 48} 
                color="#8E8E93" 
                strokeWidth={1.5} 
              />
            </View>
            <Text style={responsiveStyles.noTasksTitle}>No tasks assigned</Text>
            <Text style={responsiveStyles.noTasksSubtitle}>
              Your care provider will assign tasks to help you manage your health journey.
            </Text>
            <Text style={[
              styles.noTasksHint,
              isWeb && isDesktop && {
                fontSize: isLargeDesktop ? 16 : 15,
              }
            ]}>
              {Platform.OS === 'web' ? 'Tasks will appear here automatically when assigned.' : 'Pull down to refresh and check for new tasks.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Progress Section */}
            <View style={[
              styles.progressContainer,
              isWeb && isDesktop && {
                borderRadius: 20,
                padding: isLargeDesktop ? 28 : 24,
              }
            ]}>
              <View style={styles.progressHeader}>
                <Text style={responsiveStyles.progressTitle}>Today's Progress</Text>
                <Text style={[
                  styles.progressCount,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 16 : 15,
                  }
                ]}>
                  {completedTasksCount} of {totalTasks} completed
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[
                  styles.progressBarBackground,
                  isWeb && isDesktop && {
                    height: isLargeDesktop ? 12 : 10,
                    borderRadius: isLargeDesktop ? 6 : 5,
                  }
                ]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${progressPercentage}%` },
                      isWeb && isDesktop && {
                        borderRadius: isLargeDesktop ? 6 : 5,
                      }
                    ]} 
                  />
                </View>
                <Text style={[
                  styles.progressPercentage,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 16 : 15,
                    minWidth: isLargeDesktop ? 40 : 35,
                  }
                ]}>
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
            </View>

            {/* Tasks List */}
            <View style={styles.tasksList}>
              {tasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskCard,
                    task.completed && styles.taskCardCompleted,
                    isWeb && isDesktop && {
                      borderRadius: 20,
                      marginBottom: isLargeDesktop ? 16 : 14,
                    }
                  ]}
                  onPress={() => toggleTaskCompletion(task.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.taskContent,
                    isWeb && isDesktop && {
                      padding: isLargeDesktop ? 28 : 24,
                    }
                  ]}>
                    <View style={styles.taskInfo}>
                      <Text style={[
                        responsiveStyles.taskTitle,
                        task.completed && styles.taskTitleCompleted
                      ]}>
                        {task.title}
                      </Text>
                      <View style={styles.timeContainer}>
                        <Clock 
                          size={isWeb && isDesktop ? 16 : 14} 
                          color="#8E8E93" 
                          strokeWidth={2} 
                        />
                        <Text style={[
                          responsiveStyles.taskTime,
                          task.completed && styles.taskTimeCompleted
                        ]}>
                          {task.time}
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      styles.checkbox,
                      task.completed && styles.checkboxCompleted,
                      isWeb && isDesktop && {
                        width: isLargeDesktop ? 32 : 30,
                        height: isLargeDesktop ? 32 : 30,
                        borderRadius: isLargeDesktop ? 16 : 15,
                      }
                    ]}>
                      {task.completed && (
                        <Check 
                          size={isWeb && isDesktop ? (isLargeDesktop ? 20 : 18) : 16} 
                          color="#FFFFFF" 
                          strokeWidth={3} 
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={[
                styles.footerText,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 16 : 15,
                }
              ]}>
                Tap any task to mark it as complete
              </Text>
              <Text style={[
                styles.footerSubtext,
                isWeb && isDesktop && {
                  fontSize: isLargeDesktop ? 14 : 13,
                }
              ]}>
                {Platform.OS === 'web' ? 'Changes sync in real-time' : (isOnline ? 'Changes sync automatically' : 'Changes saved locally')}
              </Text>
            </View>
          </>
        )}
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
  header: {
    marginBottom: 24,
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
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginLeft: 12,
  },
  signOutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
    marginTop: 8,
  },
  syncStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 12,
  },
  syncButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
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
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  noTasksContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noTasksIcon: {
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
  noTasksTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  noTasksSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  noTasksHint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressContainer: {
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
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  progressCount: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    minWidth: 35,
    textAlign: 'right',
  },
  tasksList: {
    marginBottom: 24,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taskCardCompleted: {
    backgroundColor: '#F0F9FF',
    borderColor: '#007AFF',
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  taskTitleCompleted: {
    color: '#007AFF',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTime: {
    fontSize: 15,
    color: '#8E8E93',
    marginLeft: 6,
    fontWeight: '500',
  },
  taskTimeCompleted: {
    color: '#007AFF',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});