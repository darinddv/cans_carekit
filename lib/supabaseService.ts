import { supabase, Database } from './supabase';

// Use the generated type for CareTask
export type CareTask = Database['public']['Tables']['tasks']['Row'];

// Type for inserting new tasks
export type CareTaskInsert = Database['public']['Tables']['tasks']['Insert'];

// Type for updating existing tasks
export type CareTaskUpdate = Database['public']['Tables']['tasks']['Update'];

// User profile type from the users table
export type UserProfile = Database['public']['Tables']['users']['Row'];

// Type for inserting new user profiles
export type UserProfileInsert = Database['public']['Tables']['users']['Insert'];

// Utility function to create a timeout promise
function createTimeoutPromise<T>(timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
}

// Utility function to wrap any promise with a timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  const timeoutPromise = createTimeoutPromise<T>(
    timeoutMs, 
    `Operation '${operation}' timed out after ${timeoutMs}ms`
  );
  
  return Promise.race([promise, timeoutPromise]);
}

export class SupabaseService {
  // Default timeout for operations (10 seconds)
  private static readonly DEFAULT_TIMEOUT = 10000;

  // Sign in with email and password
  static async signInWithEmailAndPassword(email: string, password: string): Promise<void> {
    try {
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { error } = await withTimeout(
        signInPromise, 
        this.DEFAULT_TIMEOUT, 
        'signInWithEmailAndPassword'
      );

      if (error) {
        console.error('Error signing in with email and password:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error signing in with email and password:', error);
      throw error;
    }
  }

  // Fetch user profile by user ID
  static async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await withTimeout(
        fetchPromise, 
        this.DEFAULT_TIMEOUT, 
        'fetchUserProfile'
      );

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user profile doesn't exist
          return null;
        }
        console.error('Error fetching user profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Create a new user profile
  static async createProfile(userId: string, email: string, role: string = 'patient'): Promise<UserProfile> {
    try {
      const profileData: UserProfileInsert = {
        id: userId,
        email: email,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const createPromise = supabase
        .from('users')
        .insert(profileData)
        .select()
        .single();

      const { data, error } = await withTimeout(
        createPromise, 
        this.DEFAULT_TIMEOUT, 
        'createProfile'
      );

      if (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Get current user profile (combines auth user + profile data)
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      // Add timeout to the auth.getUser() call as well
      const getUserPromise = supabase.auth.getUser();
      const { data: { user } } = await withTimeout(
        getUserPromise, 
        this.DEFAULT_TIMEOUT, 
        'getCurrentUser'
      );
      
      if (!user) {
        return null;
      }

      // Try to fetch existing profile
      let profile = await this.fetchUserProfile(user.id);

      // If no profile exists, create one
      if (!profile && user.email) {
        console.log('Creating new user profile for:', user.email);
        profile = await this.createProfile(user.id, user.email, 'patient');
      }

      return profile;
    } catch (error) {
      console.error('Error getting current user profile:', error);
      
      // If it's a timeout error, provide more specific messaging
      if (error instanceof Error && error.message.includes('timed out')) {
        console.error('Profile fetching timed out - this may indicate network issues or server problems');
      }
      
      return null;
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const updatePromise = supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      const { data, error } = await withTimeout(
        updatePromise, 
        this.DEFAULT_TIMEOUT, 
        'updateUserProfile'
      );

      if (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Fetch all tasks for the current user
  static async fetchTasks(): Promise<CareTask[]> {
    try {
      const getUserPromise = supabase.auth.getUser();
      const { data: { user } } = await withTimeout(
        getUserPromise, 
        this.DEFAULT_TIMEOUT, 
        'getCurrentUserForTasks'
      );
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fetchPromise = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      const { data, error } = await withTimeout(
        fetchPromise, 
        this.DEFAULT_TIMEOUT, 
        'fetchTasks'
      );

      if (error) {
        console.error('Supabase fetch error:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching tasks from Supabase:', error);
      throw error;
    }
  }

  // Upsert (insert or update) a task using Supabase's native upsert
  static async upsertTask(task: CareTask): Promise<CareTask> {
    try {
      const getUserPromise = supabase.auth.getUser();
      const { data: { user } } = await withTimeout(
        getUserPromise, 
        this.DEFAULT_TIMEOUT, 
        'getCurrentUserForUpsert'
      );
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare task data for upsert - use CareTaskInsert type for better type safety
      const taskData: CareTaskInsert = {
        id: task.id,
        title: task.title,
        time: task.time,
        completed: task.completed,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      console.log('Upserting task:', taskData);

      const upsertPromise = supabase
        .from('tasks')
        .upsert(taskData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      const { data, error } = await withTimeout(
        upsertPromise, 
        this.DEFAULT_TIMEOUT, 
        'upsertTask'
      );

      if (error) {
        console.error('Error upserting task:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error upserting task to Supabase:', error);
      throw error;
    }
  }

  // Sync multiple tasks to Supabase
  static async syncTasks(tasks: CareTask[]): Promise<CareTask[]> {
    try {
      const getUserPromise = supabase.auth.getUser();
      const { data: { user } } = await withTimeout(
        getUserPromise, 
        this.DEFAULT_TIMEOUT, 
        'getCurrentUserForSync'
      );
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare tasks data for upsert
      const tasksWithUserId: CareTaskInsert[] = tasks.map(task => ({
        id: task.id,
        title: task.title,
        time: task.time,
        completed: task.completed,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }));

      console.log('Syncing tasks:', tasksWithUserId);

      const syncPromise = supabase
        .from('tasks')
        .upsert(tasksWithUserId, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      const { data, error } = await withTimeout(
        syncPromise, 
        this.DEFAULT_TIMEOUT, 
        'syncTasks'
      );

      if (error) {
        console.error('Error syncing tasks:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error syncing tasks to Supabase:', error);
      throw error;
    }
  }

  // Delete a task
  static async deleteTask(taskId: string): Promise<void> {
    try {
      const getUserPromise = supabase.auth.getUser();
      const { data: { user } } = await withTimeout(
        getUserPromise, 
        this.DEFAULT_TIMEOUT, 
        'getCurrentUserForDelete'
      );
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const deletePromise = supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      const { error } = await withTimeout(
        deletePromise, 
        this.DEFAULT_TIMEOUT, 
        'deleteTask'
      );

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting task from Supabase:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const getUserPromise = supabase.auth.getUser();
      const { data: { user } } = await withTimeout(
        getUserPromise, 
        this.DEFAULT_TIMEOUT, 
        'isAuthenticated'
      );
      return !!user;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const getUserPromise = supabase.auth.getUser();
      const { data: { user } } = await withTimeout(
        getUserPromise, 
        this.DEFAULT_TIMEOUT, 
        'getCurrentUser'
      );
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      const signOutPromise = supabase.auth.signOut();
      const { error } = await withTimeout(
        signOutPromise, 
        this.DEFAULT_TIMEOUT, 
        'signOut'
      );
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
}