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

export class SupabaseService {
  // Sign in with email and password
  static async signInWithEmailAndPassword(email: string, password: string): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

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

      const { data, error } = await supabase
        .from('users')
        .insert(profileData)
        .select()
        .single();

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
      const { data: { user } } = await supabase.auth.getUser();
      
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
      return null;
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

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
      const { data: { user } } = await supabase.auth.getUser();
      
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

      // Use Supabase's native upsert functionality
      const { data, error } = await supabase
        .from('tasks')
        .upsert(taskData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

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
      const { data: { user } } = await supabase.auth.getUser();
      
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

      const { data, error } = await supabase
        .from('tasks')
        .upsert(tasksWithUserId, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

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
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
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