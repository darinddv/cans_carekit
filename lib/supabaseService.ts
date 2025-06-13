import { supabase } from './supabase';

export interface CareTask {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export class SupabaseService {
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

      const taskData = {
        id: task.id,
        title: task.title,
        time: task.time,
        completed: task.completed,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

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

      const tasksWithUserId = tasks.map(task => ({
        id: task.id,
        title: task.title,
        time: task.time,
        completed: task.completed,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }));

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

  // Sign in anonymously (for demo purposes)
  static async signInAnonymously(): Promise<void> {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('Error signing in anonymously:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      throw error;
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