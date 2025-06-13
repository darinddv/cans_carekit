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
  RefreshControl
} from 'react-native';
import { Heart, Check, Clock, CircleAlert as AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseService, CareTask } from '@/lib/supabaseService';

const STORAGE_KEY = '@care_tasks';
const LAST_SYNC_KEY = '@last_sync';

// Default tasks data
const defaultTasks: CareTask[] = [
  {
    id: '1',
    title: 'Take Morning Medication',
    time: '8:00 AM',
    completed: false,
  },
  {
    id: '2',
    title: 'Morning Exercise',
    time: '9:00 AM',
    completed: false,
  },
  {
    id: '3',
    title: 'Mindfulness Practice',
    time: '6:00 PM',
    completed: false,
  },
  {
    id: '4',
    title: 'Evening Medication',
    time: '8:00 PM',
    completed: false,
  },
  {
    id: '5',
    title: 'Sleep Preparation',
    time: '10:00 PM',
    completed: false,
  },
];

export default function CareCardScreen() {
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Load tasks and initialize sync on component mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Auto-sync every 30 seconds when online
  useEffect(() => {
    if (!isOnline) return;

    const syncInterval = setInterval(() => {
      syncWithSupabase(false);
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [isOnline, tasks]);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load tasks from local storage first
      await loadLocalTasks();

      // Check authentication and sync
      const isAuthenticated = await SupabaseService.isAuthenticated();
      if (!isAuthenticated) {
        // Sign in anonymously for demo purposes
        await SupabaseService.signInAnonymously();
      }

      // Initial sync with Supabase
      await syncWithSupabase(true);
      
      // Load last sync time
      await loadLastSyncTime();
    } catch (err) {
      console.error('Error initializing app:', err);
      setError('Failed to initialize app. Using offline mode.');
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocalTasks = async () => {
    try {
      let storedTasks: CareTask[] = [];
      
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem(STORAGE_KEY);
        storedTasks = stored ? JSON.parse(stored) : defaultTasks;
      } else {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        storedTasks = stored ? JSON.parse(stored) : defaultTasks;
      }

      setTasks(storedTasks);
    } catch (err) {
      console.error('Error loading local tasks:', err);
      setTasks(defaultTasks);
    }
  };

  const saveLocalTasks = async (tasksToSave: CareTask[]) => {
    try {
      const tasksJson = JSON.stringify(tasksToSave);
      
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEY, tasksJson);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, tasksJson);
      }
    } catch (err) {
      console.error('Error saving local tasks:', err);
      setError('Failed to save tasks locally.');
    }
  };

  const loadLastSyncTime = async () => {
    try {
      let lastSync: string | null = null;
      
      if (Platform.OS === 'web') {
        lastSync = localStorage.getItem(LAST_SYNC_KEY);
      } else {
        lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      }

      if (lastSync) {
        setLastSyncTime(new Date(lastSync));
      }
    } catch (err) {
      console.error('Error loading last sync time:', err);
    }
  };

  const saveLastSyncTime = async () => {
    try {
      const now = new Date().toISOString();
      
      if (Platform.OS === 'web') {
        localStorage.setItem(LAST_SYNC_KEY, now);
      } else {
        await AsyncStorage.setItem(LAST_SYNC_KEY, now);
      }

      setLastSyncTime(new Date(now));
    } catch (err) {
      console.error('Error saving last sync time:', err);
    }
  };

  const syncWithSupabase = async (isInitialSync: boolean = false) => {
    try {
      if (!isInitialSync) {
        setIsSyncing(true);
      }

      // Check if user is authenticated
      const isAuthenticated = await SupabaseService.isAuthenticated();
      if (!isAuthenticated) {
        setIsOnline(false);
        return;
      }

      // Fetch tasks from Supabase
      const supabaseTasks = await SupabaseService.fetchTasks();
      
      if (isInitialSync && supabaseTasks.length > 0) {
        // If this is initial sync and Supabase has data, use it
        setTasks(supabaseTasks);
        await saveLocalTasks(supabaseTasks);
      } else if (isInitialSync && supabaseTasks.length === 0 && tasks.length > 0) {
        // If Supabase is empty but we have local data, sync local to Supabase
        await SupabaseService.syncTasks(tasks);
      } else if (!isInitialSync) {
        // For regular syncs, merge changes intelligently
        const mergedTasks = mergeTasks(tasks, supabaseTasks);
        if (JSON.stringify(mergedTasks) !== JSON.stringify(tasks)) {
          setTasks(mergedTasks);
          await saveLocalTasks(mergedTasks);
        }
      }

      setIsOnline(true);
      setError(null);
      await saveLastSyncTime();
    } catch (err) {
      console.error('Error syncing with Supabase:', err);
      setIsOnline(false);
      if (isInitialSync) {
        setError('Unable to sync with cloud. Working offline.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const mergeTasks = (localTasks: CareTask[], remoteTasks: CareTask[]): CareTask[] => {
    const taskMap = new Map<string, CareTask>();
    
    // Add all local tasks
    localTasks.forEach(task => {
      taskMap.set(task.id, task);
    });
    
    // Merge with remote tasks (remote takes precedence if updated_at is newer)
    remoteTasks.forEach(remoteTask => {
      const localTask = taskMap.get(remoteTask.id);
      if (!localTask || 
          (remoteTask.updated_at && localTask.updated_at && 
           new Date(remoteTask.updated_at) > new Date(localTask.updated_at))) {
        taskMap.set(remoteTask.id, remoteTask);
      }
    });
    
    return Array.from(taskMap.values()).sort((a, b) => 
      (a.created_at || '').localeCompare(b.created_at || '')
    );
  };

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const updatedTasks = tasks.map(task =>
        task.id === taskId
          ? { 
              ...task, 
              completed: !task.completed,
              updated_at: new Date().toISOString()
            }
          : task
      );

      // Update local state and storage immediately
      setTasks(updatedTasks);
      await saveLocalTasks(updatedTasks);

      // Try to sync with Supabase in the background
      if (isOnline) {
        const updatedTask = updatedTasks.find(task => task.id === taskId);
        if (updatedTask) {
          try {
            await SupabaseService.upsertTask(updatedTask);
            await saveLastSyncTime();
          } catch (err) {
            console.error('Error syncing task update:', err);
            setIsOnline(false);
          }
        }
      }
    } catch (err) {
      console.error('Error toggling task completion:', err);
      setError('Failed to update task.');
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await syncWithSupabase(false);
    setIsRefreshing(false);
  }, []);

  const handleManualSync = async () => {
    await syncWithSupabase(false);
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your care tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content} 
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
          <Heart size={32} color="#007AFF" strokeWidth={2} />
          <Text style={styles.title}>Care Card</Text>
          <Text style={styles.subtitle}>
            Your personalized care plan and daily tasks
          </Text>
        </View>

        {/* Sync Status */}
        <View style={styles.syncStatusContainer}>
          <View style={styles.syncStatus}>
            {isOnline ? (
              <Wifi size={16} color="#34C759" strokeWidth={2} />
            ) : (
              <WifiOff size={16} color="#FF9500" strokeWidth={2} />
            )}
            <Text style={[
              styles.syncStatusText,
              { color: isOnline ? '#34C759' : '#FF9500' }
            ]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={styles.lastSyncText}>
              Last sync: {formatLastSyncTime(lastSyncTime)}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.syncButton}
            onPress={handleManualSync}
            disabled={isSyncing || !isOnline}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <RefreshCw size={16} color={isOnline ? "#007AFF" : "#8E8E93"} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={20} color="#FF3B30" strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressCount}>
              {completedTasksCount} of {totalTasks} completed
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${progressPercentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>
              {Math.round(progressPercentage)}%
            </Text>
          </View>
        </View>

        <View style={styles.tasksList}>
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskCard,
                task.completed && styles.taskCardCompleted
              ]}
              onPress={() => toggleTaskCompletion(task.id)}
              activeOpacity={0.7}
            >
              <View style={styles.taskContent}>
                <View style={styles.taskInfo}>
                  <Text style={[
                    styles.taskTitle,
                    task.completed && styles.taskTitleCompleted
                  ]}>
                    {task.title}
                  </Text>
                  <View style={styles.timeContainer}>
                    <Clock size={14} color="#8E8E93" strokeWidth={2} />
                    <Text style={[
                      styles.taskTime,
                      task.completed && styles.taskTimeCompleted
                    ]}>
                      {task.time}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.checkbox,
                  task.completed && styles.checkboxCompleted
                ]}>
                  {task.completed && (
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tap any task to mark it as complete
          </Text>
          <Text style={styles.footerSubtext}>
            {isOnline ? 'Changes sync automatically' : 'Changes saved locally'}
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    paddingHorizontal: 20,
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