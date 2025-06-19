import { Platform } from 'react-native';
import { CareTask, SupabaseService } from './supabaseService';

// Platform-specific imports
let EncryptedStorage: any = null;
let AsyncStorage: any = null;

if (Platform.OS !== 'web') {
  // Only import these on mobile platforms
  EncryptedStorage = require('react-native-encrypted-storage').default;
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

const MOBILE_STORAGE_KEY = '@care_tasks_encrypted';
const MOBILE_LAST_SYNC_KEY = '@last_sync_mobile';

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
}

class MobileTaskStorage implements TaskStorage {
  private migrationCompleted = false;

  constructor() {
    // Perform migration on first instantiation
    this.migrateOldData().catch(console.error);
  }

  private async migrateOldData() {
    if (this.migrationCompleted) return;
    
    try {
      // Check if old data exists in AsyncStorage
      const oldData = await AsyncStorage.getItem('@care_tasks');
      if (oldData) {
        console.log('Migrating old data from AsyncStorage to EncryptedStorage...');
        await EncryptedStorage.setItem(MOBILE_STORAGE_KEY, oldData);
        await AsyncStorage.removeItem('@care_tasks');
        console.log('Task data migration complete.');
      }

      // Migrate old sync time
      const oldSyncTime = await AsyncStorage.getItem('@last_sync');
      if (oldSyncTime) {
        await AsyncStorage.setItem(MOBILE_LAST_SYNC_KEY, oldSyncTime);
        await AsyncStorage.removeItem('@last_sync');
        console.log('Sync time migration complete.');
      }

      this.migrationCompleted = true;
    } catch (error) {
      console.error('Error during data migration:', error);
      this.migrationCompleted = true; // Don't retry migration
    }
  }

  async getTasks(userId: string): Promise<CareTask[]> {
    try {
      await this.migrateOldData(); // Ensure migration is complete
      const stored = await EncryptedStorage.getItem(MOBILE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading encrypted tasks:', error);
      return [];
    }
  }

  async saveTask(task: CareTask): Promise<void> {
    try {
      // Load existing tasks, update, then save back
      const currentTasks = await this.getTasks(task.user_id || '');
      const updatedTasks = currentTasks.map(t => t.id === task.id ? task : t);
      
      // Add if new
      if (!updatedTasks.some(t => t.id === task.id)) {
        updatedTasks.push(task);
      }
      
      await EncryptedStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify(updatedTasks));
      
      // Trigger background sync (don't await to avoid blocking UI)
      this.syncWithServer(task.user_id || '').catch(console.error);
    } catch (error) {
      console.error('Error saving task to encrypted storage:', error);
      throw error;
    }
  }

  async saveTasks(tasksToSave: CareTask[]): Promise<void> {
    try {
      await EncryptedStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify(tasksToSave));
      
      // Trigger background sync if we have tasks
      if (tasksToSave.length > 0) {
        this.syncWithServer(tasksToSave[0]?.user_id || '').catch(console.error);
      }
    } catch (error) {
      console.error('Error saving tasks to encrypted storage:', error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      const currentTasks = await this.getTasks(''); // Get all tasks
      const updatedTasks = currentTasks.filter(t => t.id !== taskId);
      await EncryptedStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify(updatedTasks));
      
      // Trigger background sync
      this.syncWithServer('').catch(console.error);
    } catch (error) {
      console.error('Error deleting task from encrypted storage:', error);
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

      // 1. Get local tasks
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
      await EncryptedStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify(latestRemoteTasks));
      await this.saveLastSyncTime();

      console.log('Mobile sync completed successfully');
    } catch (error) {
      console.error('Error syncing with server:', error);
      throw error;
    }
  }
}

// Export the platform-appropriate storage instance
export const taskStorage: TaskStorage = Platform.OS === 'web' 
  ? new WebTaskStorage() 
  : new MobileTaskStorage();