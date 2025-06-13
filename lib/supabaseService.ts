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

  // Upsert (insert or update) a task
  static async upsertTask(task: CareTask): Promise<CareTask> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if task exists
      const { data: existingTasks, error: checkError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', task.id)
        .eq('user_id', user.id);

      if (checkError) {
        console.error('Error checking existing task:', checkError);
        throw checkError;
      }

      const taskExists = existingTasks && existingTasks.length > 0;

      if (taskExists) {
        // Update existing task
        const { data, error } = await supabase
          .from('tasks')
          .update({
            title: task.title,
            time: task.time,
            completed: task.completed,
            updated_at: new Date().toISOString(),
          })
          .eq('id', task.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating task:', error);
          throw error;
        }

        return data;
      } else {
        // Insert new task
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            id: task.id,
            title: task.title,
            time: task.time,
            completed: task.completed,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('Error inserting task:', error);
          throw error;
        }

        return data;
      }
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

      // Process tasks one by one to avoid upsert issues
      const syncedTasks: CareTask[] = [];
      
      for (const task of tasks) {
        try {
          const syncedTask = await this.upsertTask(task);
          syncedTasks.push(syncedTask);
        } catch (error) {
          console.error(`Error syncing task ${task.id}:`, error);
          // Continue with other tasks even if one fails
        }
      }

      return syncedTasks;
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