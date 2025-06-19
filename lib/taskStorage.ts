import { Platform } from 'react-native';
import { CareTask, SupabaseService } from './supabaseService';
import { supabase } from './supabase';
import * as SecureStore from 'expo-secure-store';

// Platform-specific imports
let AsyncStorage: any = null;

if (Platform.OS !== 'web') {
  // Only import AsyncStorage on mobile platforms
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

// Use simple, valid keys for SecureStore (alphanumeric, dots, dashes, underscores only)
const MOBILE_STORAGE_KEY = 'care_tasks_encrypted';
const MOBILE_LAST_SYNC_KEY = 'last_sync_mobile';
const MIGRATION_FLAG_KEY = 'migration_completed';

export interface TaskStorage {
  getTasks(userId: string): Promise<CareTask[]>;
  saveTask(task: CareTask): Promise<void>;
  saveTasks(tasks: CareTask[]): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  
  // Methods for sync metadata, primarily for mobile
  getLastSyncTime?(): Promise<Date | null>;
  saveLastSyncTime?(): Promise<void>;

  // Method for explicit sync, primarily for mobile
  syncWithServer?(userId: string): Promise<void>;

  // Real-time subscription method
  subscribeToChanges?(callback: (tasks: CareTask[]) => void, userId: string): () => void;
}

class WebTaskStorage implements TaskStorage {
  async getTasks(userId: string): Promise<CareTask[]> {
    // On web, always fetch directly from Supabase
    return SupabaseService.fetchTasks();
  }

  async saveTask(task: CareTask): Promise<void> {
    await SupabaseService.upsertTask(task);
  }

  async saveTasks(tasks: CareTask[]): Promise<void> {
    await SupabaseService.syncTasks(tasks);
  }

  async deleteTask(taskId: string): Promise<void> {
    await SupabaseService.deleteTask(taskId);
  }

  // These methods are not applicable for web's direct-to-server model
  async getLastSyncTime(): Promise<Date | null> { 
    return null; 
  }
  
  async saveLastSyncTime(): Promise<void> { 
    // no-op for web
  }
  
  async syncWithServer(userId: string): Promise<void> { 
    // no-op for web - all operations are already direct to server
  }

  subscribeToChanges(callback: (tasks: CareTask[]) => void, userId: string): () => void {
    console.log('Setting up real-time subscription for web user:', userId);

    const subscription = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('Real-time change received on web:', payload);
          try {
            // Re-fetch all tasks to ensure consistency
            const updatedTasks = await SupabaseService.fetchTasks();
            callback(updatedTasks);
          } catch (error) {
            console.error('Error handling real-time update on web:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Web real-time subscription status:', status);
      });

    // Return unsubscribe function
    return () => {
      console.log('Unsubscribing from web real-time updates');
      subscription.unsubscribe();
    };
  }
}

class MobileTaskStorage implements TaskStorage {
  private migrationCompleted = false;

  constructor() {
    // Perform migration on first instantiation
    this.checkMigrationStatus().then(() => {
      if (!this.migrationCompleted) {
        this.migrateOldData().catch(console.error);
      }
    });
  }

  private async checkMigrationStatus() {
    try {
      const migrationFlag = await SecureStore.getItemAsync(MIGRATION_FLAG_KEY);
      this.migrationCompleted = migrationFlag === 'true';
    } catch (error) {
      console.error('Error checking migration status:', error);
      this.migrationCompleted = false;
    }
  }

  private async migrateOldData() {
    if (this.migrationCompleted) return;
    
    try {
      console.log('Starting data migration from AsyncStorage to SecureStore...');
      
      // Check if old data exists in AsyncStorage
      const oldData = await AsyncStorage.getItem('@care_tasks');
      if (oldData) {
        console.log('Migrating task data...');
        await SecureStore.setItemAsync(MOBILE_STORAGE_KEY, oldData);
        await AsyncStorage.removeItem('@care_tasks');
        console.log('Task data migration complete.');
      }

      // Migrate old sync time
      const oldSyncTime = await AsyncStorage.getItem('@last_sync');
      if (oldSyncTime) {
        console.log('Migrating sync time...');
        await AsyncStorage.setItem(MOBILE_LAST_SYNC_KEY, oldSyncTime);
        await AsyncStorage.removeItem('@last_sync');
        console.log('Sync time migration complete.');
      }

      // Mark migration as completed
      await SecureStore.setItemAsync(MIGRATION_FLAG_KEY, 'true');
      this.migrationCompleted = true;
      console.log('Migration completed successfully.');
    } catch (error) {
      console.error('Error during data migration:', error);
      // Don't mark as completed if migration failed
    }
  }

  async getTasks(userId: string): Promise<CareTask[]> {
    try {
      // Ensure migration is complete before proceeding
      if (!this.migrationCompleted) {
        await this.checkMigrationStatus();
        if (!this.migrationCompleted) {
          await this.migrateOldData();
        }
      }

      const stored = await SecureStore.getItemAsync(MOBILE_STORAGE_KEY);
      const allTasks: CareTask[] = stored ? JSON.parse(stored) : [];
      
      // Filter tasks for the specific user
      return allTasks.filter(task => task.user_id === userId);
    } catch (error) {
      console.error('Error loading secure tasks:', error);
      return [];
    }
  }

  async saveTask(task: CareTask): Promise<void> {
    try {
      // Load all existing tasks
      const stored = await SecureStore.getItemAsync(MOBILE_STORAGE_KEY);
      const allTasks: CareTask[] = stored ? JSON.parse(stored) : [];
      
      // Update or add the task
      const existingIndex = allTasks.findIndex(t => t.id === task.id);
      if (existingIndex >= 0) {
        allTasks[existingIndex] = task;
      } else {
        allTasks.push(task);
      }
      
      await SecureStore.setItemAsync(MOBILE_STORAGE_KEY, JSON.stringify(allTasks));
      
      // Trigger background sync (don't await to avoid blocking UI)
      if (task.user_id) {
        this.syncWithServer(task.user_id).catch(console.error);
      }
    } catch (error) {
      console.error('Error saving task to secure storage:', error);
      throw error;
    }
  }

  async saveTasks(tasksToSave: CareTask[]): Promise<void> {
    try {
      if (tasksToSave.length === 0) {
        await SecureStore.setItemAsync(MOBILE_STORAGE_KEY, JSON.stringify([]));
        return;
      }

      // Get the user ID from the first task
      const userId = tasksToSave[0]?.user_id;
      if (!userId) {
        throw new Error('No user ID found in tasks');
      }

      // Load existing tasks
      const stored = await SecureStore.getItemAsync(MOBILE_STORAGE_KEY);
      const allTasks: CareTask[] = stored ? JSON.parse(stored) : [];
      
      // Remove existing tasks for this user
      const otherUserTasks = allTasks.filter(task => task.user_id !== userId);
      
      // Combine with new tasks for this user
      const updatedTasks = [...otherUserTasks, ...tasksToSave];
      
      await SecureStore.setItemAsync(MOBILE_STORAGE_KEY, JSON.stringify(updatedTasks));
      
      // Trigger background sync
      this.syncWithServer(userId).catch(console.error);
    } catch (error) {
      console.error('Error saving tasks to secure storage:', error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(MOBILE_STORAGE_KEY);
      const allTasks: CareTask[] = stored ? JSON.parse(stored) : [];
      
      const taskToDelete = allTasks.find(t => t.id === taskId);
      const updatedTasks = allTasks.filter(t => t.id !== taskId);
      
      await SecureStore.setItemAsync(MOBILE_STORAGE_KEY, JSON.stringify(updatedTasks));
      
      // Trigger background sync if we know the user ID
      if (taskToDelete?.user_id) {
        this.syncWithServer(taskToDelete.user_id).catch(console.error);
      }
    } catch (error) {
      console.error('Error deleting task from secure storage:', error);
      throw error;
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const lastSync = await AsyncStorage.getItem(MOBILE_LAST_SYNC_KEY);
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      console.error('Error loading mobile last sync time:', error);
      return null;
    }
  }

  async saveLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(MOBILE_LAST_SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Error saving mobile last sync time:', error);
    }
  }

  async syncWithServer(userId: string): Promise<void> {
    try {
      // Check if user is authenticated
      const isAuthenticated = await SupabaseService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('User not authenticated');
      }

      console.log('Starting sync with server for user:', userId);

      // 1. Get local tasks for this user
      const localTasks = await this.getTasks(userId);
      
      // 2. Get remote tasks
      const remoteTasks = await SupabaseService.fetchTasks();

      // 3. Simple reconciliation strategy:
      // - Push any local changes that are newer than remote
      // - Then pull latest from server as source of truth
      
      const tasksToUpsert = localTasks.filter(localTask => {
        const remoteTask = remoteTasks.find(rt => rt.id === localTask.id);
        // If task is new locally OR local version is newer than remote
        return !remoteTask || 
               (new Date(localTask.updated_at || 0) > new Date(remoteTask.updated_at || 0));
      });

      // Push local changes to server
      if (tasksToUpsert.length > 0) {
        console.log(`Syncing ${tasksToUpsert.length} local changes to server`);
        await SupabaseService.syncTasks(tasksToUpsert);
      }

      // Pull latest from server to ensure consistency
      const latestRemoteTasks = await SupabaseService.fetchTasks();
      
      // Save all tasks (not just for this user, to maintain consistency)
      await SecureStore.setItemAsync(MOBILE_STORAGE_KEY, JSON.stringify(latestRemoteTasks));
      await this.saveLastSyncTime();

      console.log('Mobile sync completed successfully');
    } catch (error) {
      console.error('Error syncing with server:', error);
      throw error;
    }
  }

  subscribeToChanges(callback: (tasks: CareTask[]) => void, userId: string): () => void {
    console.log('Setting up real-time subscription for mobile user:', userId);

    const subscription = supabase
      .channel('tasks-changes-mobile')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('Real-time change received on mobile:', payload);
          try {
            // For mobile, trigger a background sync to maintain local-first approach
            await this.syncWithServer(userId);
            
            // After sync, get updated tasks and notify callback
            const updatedTasks = await this.getTasks(userId);
            callback(updatedTasks);
          } catch (error) {
            console.error('Error handling real-time update on mobile:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Mobile real-time subscription status:', status);
      });

    // Return unsubscribe function
    return () => {
      console.log('Unsubscribing from mobile real-time updates');
      subscription.unsubscribe();
    };
  }
}

// Export the platform-appropriate storage instance
export const taskStorage: TaskStorage = Platform.OS === 'web' 
  ? new WebTaskStorage() 
  : new MobileTaskStorage();